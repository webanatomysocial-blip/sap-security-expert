const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { asyncHandler } = require('../utils/asyncHandler');
const OTPService = require('../services/OTPService');
const NotificationService = require('../services/NotificationService');
const MailService = require('../services/MailService');
const repo = require('../repositories/membersRepository');

// POST /api/member/login
const login = async (req, res) => {
  const db = req.db;
  const { email: emailInput, password } = req.body || {};

  if (!emailInput || !password) {
    return res.status(400).json({ status: 'error', message: 'Email/Username and password are required.' });
  }

  try {
    // Look up member, user, and contributor records
    let member = await repo.findMemberByEmailOrUsername(db, emailInput);
    let user = await repo.findUserByEmailOrUsername(db, emailInput);

    let contributor = await repo.findContributorByEmail(db, emailInput);

    if (user && !contributor && user.contributor_id) {
      contributor = await repo.findContributorById(db, user.contributor_id);
    }

    // Resolve actual email for cross-table lookup
    if (!member && (user || contributor)) {
      const resolvedEmail = (user?.email) || (contributor?.email);
      if (resolvedEmail && resolvedEmail.toLowerCase() !== emailInput.toLowerCase()) {
        member = await repo.findMemberByEmailExact(db, resolvedEmail);
      }
    }

    if (!member && !user && !contributor) {
      return res.status(401).json({ status: 'error', message: 'Invalid email/username or password.' });
    }

    // Verify password
    const passwordHash = member?.password_hash || user?.password;
    const isValid = passwordHash && await bcrypt.compare(password, passwordHash);
    if (!isValid) {
      return res.status(401).json({ status: 'error', message: 'Invalid email/username or password.' });
    }

    // Lazy migration: create a member record for any user/contributor who doesn't have one yet
    if (!member && (user || contributor)) {
      const newEmail = user?.email || contributor?.email || emailInput;
      const newName = contributor?.full_name || user?.username || 'Member';
      await repo.createMemberLazy(db, { name: newName, email: newEmail, passwordHash });
      member = await repo.findMemberByEmailExactRaw(db, newEmail);
    }

    if (member?.is_deleted == 1 || member?.status === 'deleted') {
      return res.status(403).json({ status: 'error', message: 'This account has been deactivated.' });
    }
    if (member?.status === 'pending') {
      return res.status(403).json({ status: 'error', message: 'Your account is pending approval.' });
    }

    // Setup session
    req.session.member_logged_in = true;
    req.session.member_id = member.id;
    req.session.member_email = member.email;
    req.session.member_name = member.name;
    req.session.member_status = member.status;
    // Every logged-in session gets a CSRF token, not just contributors/admins —
    // member-facing mutating routes (profile update, payments) verify this too.
    req.session.csrf_token = req.session.csrf_token || crypto.randomBytes(32).toString('hex');

    let isContributor = false;
    let adminData = null;
    let permissions = {};

    if (user && user.is_active == 1 && user.role === 'contributor') {
      isContributor = true;
      req.session.admin_id = user.id;
      req.session.admin_user = user.username;
      req.session.admin_logged_in = true;
      req.session.role = user.role;
      req.session.is_active = 1;

      const p = await repo.findPermissionsByUserId(db, user.id);
      if (p) {
        permissions = {
          can_manage_blogs: !!p.can_manage_blogs,
          can_manage_ads: !!p.can_manage_ads,
          can_manage_comments: !!p.can_manage_comments,
          can_manage_announcements: !!p.can_manage_announcements,
          can_review_blogs: !!p.can_review_blogs,
          can_access_premium_articles: !!p.can_access_premium_articles,
        };
      }
      req.session.permissions = permissions;
      adminData = { id: user.id, username: user.username, role: user.role };
    }

    await repo.recordMemberLogin(db, member.id).catch(() => {});
    if (isContributor) await repo.recordUserLogin(db, user.id).catch(() => {});

    // Fetch active subscription (if any)
    const subscription = await repo.findActiveSubscription(db, member.id);
    if (subscription) {
      req.session.has_premium = true;
      req.session.premium_expires_at = subscription.expires_at;
    }

    const ambassadorBadge = await repo.findAmbassadorBadgeByEmail(db, member.email);

    return res.json({
      status: 'success',
      is_contributor: isContributor,
      is_ambassador: !!ambassadorBadge,
      csrf_token: req.session.csrf_token || null,
      admin_user: adminData,
      permissions,
      member: {
        id: member.id,
        name: member.name,
        email: member.email,
        username: member.username || null,
        phone: member.phone || null,
        location: member.location || null,
        country: member.country || null,
        company_name: member.company_name || null,
        job_role: member.job_role || null,
        profile_image: member.profile_image || null,
        profile_visibility: member.profile_visibility || null,
        receive_blog_emails: member.receive_blog_emails ?? 1,
        status: member.status,
        ambassador_has_badge: !!(ambassadorBadge && ambassadorBadge.has_badge),
        ambassador_badge_year: ambassadorBadge ? ambassadorBadge.badge_year : null,
        ambassador_badge_country: ambassadorBadge ? ambassadorBadge.country : null,
        ambassador_badge_years: ambassadorBadge ? ambassadorBadge.badge_years : [],
      },
      subscription,
    });
  } catch (err) {
    console.error('[member_login]', err.message);
    return res.status(500).json({ status: 'error', message: 'Login technical error. Please try again.' });
  }
};

// POST /api/member/signup
const signup = async (req, res) => {
  const db = req.db;
  const {
    name, phone, email, location, country, company_name, job_role, username: rawUsername,
    password, receive_blog_emails = 1, ref_code, goals, currentRole, researchOptIn,
  } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ status: 'error', message: 'Name, email and password are required.' });
  }
  if (!country || !country.trim()) {
    return res.status(400).json({ status: 'error', message: 'Country is required.' });
  }

  // Validate format before any DB calls
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ status: 'error', message: 'Please enter a valid email address.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ status: 'error', message: 'Password must be at least 8 characters.' });
  }

  const otpService = new OTPService(db);
  if (!await otpService.isVerified(email, 'signup')) {
    return res.status(403).json({ status: 'error', message: 'Email not verified. Please verify your email with OTP first.' });
  }

  try {
    const existing = await repo.findMemberStatusByEmail(db, email);
    if (existing) {
      const s = existing.status;
      const isDeleted = existing.is_deleted;
      if (s === 'deactivated' || isDeleted === 1 || s === 'deleted') {
        return res.status(403).json({
          status: 'deactivated',
          message: 'This account has been deactivated. Please contact the administrator at hello@sapsecurityexpert.com to reactivate it.'
        });
      }
      const msgs = { pending: 'Your signup request is already on our waitlist and pending admin approval.', approved: 'This email is already registered. Please log in.' };
      return res.status(409).json({ status: 'error', message: msgs[s] || 'This email was previously rejected. Contact the administrator.' });
    }

    if (await repo.userExistsByEmail(db, email)) {
      return res.status(409).json({ status: 'error', message: 'You already have a contributor account with this email. Please use your existing credentials.' });
    }

    // Unique username check
    let username;
    if (rawUsername) {
      username = rawUsername;
      if (await repo.memberExistsByUsername(db, username) || await repo.userExistsByUsername(db, username)) {
        return res.status(409).json({ status: 'error', message: 'The username is already taken. Please choose another one.' });
      }
    } else {
      username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
      for (let i = 0; i < 10; i++) {
        const taken = await repo.memberExistsByUsername(db, username) || await repo.userExistsByUsername(db, username);
        if (!taken) break;
        username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + Math.floor(Math.random() * 900 + 100);
      }
    }

    const hash = await bcrypt.hash(password, 10);
    // Generate a unique referral code for this member
    const newRefCode = crypto.randomBytes(5).toString('hex').toUpperCase();

    // Validate the referrer's code if provided
    let referredByCode = null;
    if (ref_code) {
      const valid = await repo.findApprovedMemberByReferralCode(db, ref_code.toUpperCase());
      if (valid) referredByCode = ref_code.toUpperCase();
    }

    await repo.insertMember(db, {
      name, phone, email, username, location, country, company_name, job_role, hash,
      receive_blog_emails, newRefCode, referredByCode, goals, currentRole, researchOptIn,
    });

    const mailService = MailService.getInstance();
    const notifier = new NotificationService(mailService, db);
    notifier.notifyMemberSignupSubmitted(email, name).catch(() => {});

    return res.json({
      status: 'success',
      message: 'You have been added to our community waitlist! An admin will review your profile shortly.',
    });
  } catch (err) {
    console.error('[member_signup]', err.message);
    return res.status(500).json({ status: 'error', message: 'Signup failed. Please try again.' });
  }
};

// GET /api/member/profile
const getProfile = asyncHandler(async (req, res) => {
  const db = req.db;
  if (!req.session.member_logged_in) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
  const profile = await repo.findMemberProfileById(db, req.session.member_id);
  if (!profile) return res.status(404).json({ status: 'error', message: 'Profile not found' });

  const subscription = await repo.findActiveSubscription(db, req.session.member_id);

  // Determine reputation level
  const isContributor = await repo.findContributorApprovedByEmail(db, profile.email);
  const reputation_level = isContributor ? 'Contributor' : 'Explorer';

  const ambassadorBadge = await repo.findAmbassadorBadgeByEmail(db, profile.email);
  profile.ambassador_has_badge = !!(ambassadorBadge && ambassadorBadge.has_badge);
  profile.ambassador_badge_year = ambassadorBadge ? ambassadorBadge.badge_year : null;
  profile.ambassador_badge_country = ambassadorBadge ? ambassadorBadge.country : null;
  profile.ambassador_badge_years = ambassadorBadge ? ambassadorBadge.badge_years : [];

  // Contributor profiles only go public after publishing ≥1 article —
  // surface that here so Profile Settings can explain why their photo/
  // profile isn't showing publicly yet. Ambassadors don't have this
  // requirement (an earned recognition, not a content role), so they never
  // see this notice.
  if (isContributor) {
    const articlesPublished = await repo.countPublishedArticlesByEmail(db, profile.email);
    profile.is_public_profile_pending = articlesPublished === 0;
  }

  // Self-heal sessions created before CSRF protection was added to member
  // routes — those have no session.csrf_token at all, which would make every
  // change-password/profile-update/payment request 403 until the member
  // logs out and back in. Re-issue it here (called on every app load via
  // the profile refetch) so existing sessions repair themselves silently.
  if (!req.session.csrf_token) {
    req.session.csrf_token = crypto.randomBytes(32).toString('hex');
  }

  return res.json({
    status: 'success',
    member: { ...profile, reputation_level },
    subscription,
    csrf_token: req.session.csrf_token,
  });
});

// POST /api/member/profile/update
const updateProfile = asyncHandler(async (req, res) => {
  const db = req.db;
  if (!req.session.member_logged_in) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
  const { name, phone, location, country, company_name, job_role, receive_blog_emails, profile_visibility } = req.body || {};

  let profileImage = null;
  if (req.file) {
    profileImage = '/uploads/profiles/' + req.file.filename;
  }

  await repo.updateMemberProfile(db, req.session.member_id, {
    name, phone, location, country, company_name, job_role, receive_blog_emails, profile_visibility, profileImage,
  });

  // Sync profile image to contributor/user account (same email) so both portals show the same photo
  if (profileImage) {
    const memberRow = await repo.findMemberEmailById(db, req.session.member_id);
    if (memberRow) {
      await repo.syncProfileImageToUserAndContributor(db, memberRow.email, profileImage);
    }
  }

  const updated = await repo.findMemberProfileById(db, req.session.member_id);
  req.session.member_name = updated?.name || req.session.member_name;
  return res.json({ status: 'success', message: 'Profile updated', member: updated });
});

// POST /api/member/logout
const logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ status: 'success' });
  });
};

// Grant an achievement and send email if newly granted
// Email clients don't load the Bootstrap Icons font used on the site, so the
// achievement's `icon` field (a CSS class like "bi-pen-fill") can't be rendered
// there directly — it would just show as literal text. Emoji render natively
// in virtually every email client, so map each achievement to one instead.
const ACHIEVEMENT_EMAIL_EMOJI = {
  welcome: '✨',
  first_comment: '💬',
  '100_helpful_comments': '🏆',
  top_contributor: '✍️',
  profile_complete: '✅',
  linkedin_ambassador: '💼',
  first_referral: '🤝',
};

async function grantAndNotify(db, mailer, memberId, achievementId, memberEmail, memberName, siteUrl) {
  // Check if already earned before inserting
  const existing = await repo.findAchievementRecord(db, memberId, achievementId);
  if (existing) return; // already granted, skip

  await repo.insertAchievement(db, memberId, achievementId);

  // Fetch achievement type details for email
  const type = await repo.findAchievementType(db, achievementId);
  if (!type || !memberEmail) return;

  const { label, description } = type;
  if (mailer) {
    const sent = await mailer.send(
      db,
      memberEmail,
      `🏅 Achievement Unlocked: ${label}`,
      'member/achievement_unlocked',
      {
        name: memberName || 'Member',
        label,
        description,
        icon: ACHIEVEMENT_EMAIL_EMOJI[achievementId] || '🏅',
        achievements_url: `${siteUrl}/member/achievements`,
      }
    );
    if (sent) {
      await repo.markAchievementEmailSent(db, memberId, achievementId);
    }
  }
}

// GET /api/member/referral — return member's referral code + stats
const referral = asyncHandler(async (req, res) => {
  if (!req.session.member_logged_in) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
  const db = req.db;
  const memberId = req.session.member_id;

  const row = await repo.findReferralCodeById(db, memberId);
  if (!row) return res.status(404).json({ status: 'error', message: 'Member not found' });

  let code = row.referral_code;
  // Generate a code if somehow missing (backfill)
  if (!code) {
    code = crypto.randomBytes(5).toString('hex').toUpperCase();
    await repo.updateReferralCode(db, memberId, code);
  }

  const referrals_count = await repo.countApprovedReferrals(db, code);
  const siteUrl = (process.env.SITE_URL || 'http://sapsecurityexpert.com').replace(/\/$/, '');

  return res.json({
    status: 'success',
    referral_code: code,
    referral_link: `${siteUrl}/member/signup?ref=${code}`,
    referrals_count,
  });
});

// GET /api/member/achievements — works with session or ?member_id param
const achievements = asyncHandler(async (req, res) => {
  const db = req.db;
  await repo.ensureAchievementTables(db);

  // Only use session member_id for auto-grant/email logic.
  // ?member_id= (public profile view) gets read-only data with no side-effects.
  const sessionMemberId = req.session.member_id || null;
  const viewMemberId = req.query.member_id || sessionMemberId;

  if (!viewMemberId) {
    // Return all types as locked if no member context
    const types = await repo.findAllAchievementTypes(db);
    return res.json({
      status: 'success',
      achievements: types.map(t => ({ ...t, earned: false, earned_at: null })),
    });
  }

  // Only run auto-grant and send emails for the authenticated member's own profile
  const memberId = sessionMemberId;

  // Fetch member info for email notifications (only needed when member is logged in)
  const memberRow = memberId ? await repo.findMemberEmailAndName(db, memberId) : null;

  const memberEmail = memberRow?.email || null;
  const memberName = memberRow?.name || 'Member';
  const siteUrl = (process.env.SITE_URL || 'http://sapsecurityexpert.com').replace(/\/$/, '');
  const mailer = MailService.getInstance();

  // Auto-grant logic only runs for the authenticated member's own session
  if (memberId) {
    await grantAndNotify(db, mailer, memberId, 'welcome', memberEmail, memberName, siteUrl);

    const commentCount = await repo.countApprovedComments(db, memberId);
    if (commentCount >= 1) {
      await grantAndNotify(db, mailer, memberId, 'first_comment', memberEmail, memberName, siteUrl);
    }
    if (commentCount >= 100) {
      await grantAndNotify(db, mailer, memberId, '100_helpful_comments', memberEmail, memberName, siteUrl);
    }

    if (memberRow?.email) {
      const isContributor = await repo.findContributorApprovedByEmail(db, memberRow.email);
      if (isContributor) {
        await grantAndNotify(db, mailer, memberId, 'top_contributor', memberEmail, memberName, siteUrl);
      }
    }

    if (await repo.hasCreditTransactionNote(db, memberId, 'Complete profile bonus')) {
      await grantAndNotify(db, mailer, memberId, 'profile_complete', memberEmail, memberName, siteUrl);
    }

    if (await repo.hasCreditTransactionNote(db, memberId, 'LinkedIn share bonus')) {
      await grantAndNotify(db, mailer, memberId, 'linkedin_ambassador', memberEmail, memberName, siteUrl);
    }

    const referralRow = await repo.findReferralCodeById(db, memberId);
    if (referralRow?.referral_code) {
      const cnt = await repo.countApprovedReferrals(db, referralRow.referral_code);
      if (cnt >= 1) {
        await grantAndNotify(db, mailer, memberId, 'first_referral', memberEmail, memberName, siteUrl);
      }
    }
  }

  // Fetch all types + earned status for whichever member is being viewed
  const types = await repo.findAllAchievementTypes(db);
  const earned = await repo.findEarnedAchievements(db, viewMemberId);
  const earnedMap = {};
  earned.forEach(r => { earnedMap[r.achievement_id] = r.earned_at; });

  const achievementsList = types.map(t => ({
    ...t,
    earned: !!earnedMap[t.id],
    earned_at: earnedMap[t.id] || null,
  }));

  return res.json({ status: 'success', achievements: achievementsList });
});

// POST /api/member/achievements/grant — admin-only manual grant
const grantAchievement = asyncHandler(async (req, res) => {
  const db = req.db;
  const { member_id, achievement_id } = req.body || {};
  if (!member_id || !achievement_id) {
    return res.status(400).json({ status: 'error', message: 'member_id and achievement_id are required.' });
  }
  await repo.ensureAchievementTables(db);
  const memberRow = await repo.findMemberEmailAndName(db, member_id);
  const memberEmail = memberRow?.email || null;
  const memberName = memberRow?.name || 'Member';
  const siteUrl = (process.env.SITE_URL || 'http://sapsecurityexpert.com').replace(/\/$/, '');
  const mailer = MailService.getInstance();
  await grantAndNotify(db, mailer, member_id, achievement_id, memberEmail, memberName, siteUrl);
  return res.json({ status: 'success', message: 'Achievement granted.' });
});

// POST /api/member/change-password
const changePassword = asyncHandler(async (req, res) => {
  if (!req.session.member_logged_in) {
    return res.status(401).json({ status: 'error', message: 'Not authenticated.' });
  }
  const db = req.db;
  const { current_password, new_password } = req.body || {};
  if (!current_password || !new_password) {
    return res.status(400).json({ status: 'error', message: 'Both current and new passwords are required.' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ status: 'error', message: 'New password must be at least 8 characters.' });
  }

  const member = await repo.findMemberAuthById(db, req.session.member_id);
  if (!member) return res.status(404).json({ status: 'error', message: 'Member not found.' });

  const match = await bcrypt.compare(current_password, member.password_hash);
  if (!match) return res.status(400).json({ status: 'error', message: 'Current password is incorrect.' });

  const hash = await bcrypt.hash(new_password, 10);

  // Update members table
  await repo.updateMemberPassword(db, member.id, hash);

  // Sync to users table if contributor/admin account shares this email
  await repo.syncPasswordToUser(db, member.email, hash);

  return res.json({ status: 'success', message: 'Password changed successfully.' });
});

module.exports = {
  login, signup, getProfile, updateProfile, logout, referral, achievements, grantAchievement, changePassword,
};
