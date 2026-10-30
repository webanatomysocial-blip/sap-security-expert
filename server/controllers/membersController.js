const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { asyncHandler } = require('../utils/asyncHandler');
const OTPService = require('../services/OTPService');
const NotificationService = require('../services/NotificationService');
const MailService = require('../services/MailService');
const { grantAndNotify, syncAchievementsInBackground } = require('../services/achievements');
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
    // Catch up on anything earned while logged out (e.g. welcome for new members)
    syncAchievementsInBackground(db, member.id);
    req.session.member_email = member.email;
    req.session.member_name = member.name;
    req.session.member_status = member.status;
    // Every logged-in session gets a CSRF token, not just contributors/admins —
    // member-facing mutating routes (profile update, payments) verify this too.
    req.session.csrf_token = req.session.csrf_token || crypto.randomBytes(32).toString('hex');

    const ambassadorBadge = await repo.findAmbassadorBadgeByEmail(db, member.email);
    const isRealContributor = await repo.findContributorApprovedByEmail(db, member.email);

    let isContributor = false;
    let adminData = null;
    let permissions = {};

    // Ambassador-only accounts must never get an admin/dashboard session —
    // only an actually-approved Contributor receives an admin session.
    if (user && user.is_active == 1 && user.role === 'contributor' && isRealContributor) {
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

    const [recentArticles, articlesCount, recentComments, commentCount, contributorStats, earnedBadges] = await Promise.all([
      repo.findRecentArticlesByEmail(db, member.email).catch(() => []),
      repo.countPublishedArticlesByEmail(db, member.email).catch(() => 0),
      repo.findRecentCommentsByMember(db, member.id, member.email, 5).catch(() => []),
      repo.countApprovedCommentsByMember(db, member.id, member.email).catch(() => 0),
      isRealContributor ? repo.findContributorStatsByEmail(db, member.email).catch(() => null) : null,
      repo.findMemberEarnedBadges(db, member.id).catch(() => []),
    ]);

    return res.json({
      status: 'success',
      is_contributor: isContributor,
      is_real_contributor: isRealContributor,
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
        state: member.state || null,
        company_name: member.company_name || null,
        job_role: member.job_role || null,
        headline: member.headline || null,
        bio: member.bio || null,
        linkedin: member.linkedin || null,
        expertise_tags: member.expertise_tags || null,
        sap_certifications: member.sap_certifications || null,
        profile_image: member.profile_image || null,
        profile_visibility: member.profile_visibility || null,
        receive_blog_emails: member.receive_blog_emails ?? 1,
        status: member.status,
        is_real_contributor: isRealContributor,
        is_ambassador: !!ambassadorBadge,
        ambassador_has_badge: !!(ambassadorBadge && ambassadorBadge.has_badge),
        ambassador_badge_year: ambassadorBadge ? ambassadorBadge.badge_year : null,
        ambassador_badge_country: ambassadorBadge ? ambassadorBadge.country : null,
        ambassador_badge_years: ambassadorBadge ? ambassadorBadge.badge_years : [],
        recent_articles: recentArticles,
        articles_count: articlesCount,
        recent_comments: recentComments,
        comment_count: commentCount,
        contributor_stats: contributorStats,
        badges: earnedBadges,
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
    name, phone, email, location, country, state, company_name, job_role, username: rawUsername,
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
      name, phone, email, username, location, country, state, company_name, job_role, hash,
      receive_blog_emails, newRefCode, referredByCode, goals, currentRole, researchOptIn,
    });

    const mailService = MailService.getInstance();
    const notifier = new NotificationService(mailService, db);
    notifier.notifyMemberSignupSubmitted(email, name).catch((err) => {
      console.error('[member_signup] Notification error:', err.message);
    });

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
  // Distinguishes "actually approved as a Contributor" from merely "has an
  // admin-portal-capable login" — an Ambassador-only account shares the
  // latter (needed so they can still publish articles) but must never see
  // the Contributor Dashboard link.
  profile.is_real_contributor = isContributor;

  const ambassadorBadge = await repo.findAmbassadorBadgeByEmail(db, profile.email);
  profile.is_ambassador = !!ambassadorBadge;
  profile.ambassador_has_badge = !!(ambassadorBadge && ambassadorBadge.has_badge);
  profile.ambassador_badge_year = ambassadorBadge ? ambassadorBadge.badge_year : null;
  profile.ambassador_badge_country = ambassadorBadge ? ambassadorBadge.country : null;
  profile.ambassador_badge_years = ambassadorBadge ? ambassadorBadge.badge_years : [];

  if (isContributor) {
    const articlesPublished = await repo.countPublishedArticlesByEmail(db, profile.email);
    profile.is_public_profile_pending = articlesPublished === 0;
  } else {
    profile.is_public_profile_pending = false;
  }

  const recentArticles = await repo.findRecentArticlesByEmail(db, profile.email);
  profile.recent_articles = recentArticles;
  profile.articles_count = await repo.countPublishedArticlesByEmail(db, profile.email);

  const [recentComments, commentCount, contributorStats, earnedBadges] = await Promise.all([
    repo.findRecentCommentsByMember(db, profile.id, profile.email, 5),
    repo.countApprovedCommentsByMember(db, profile.id, profile.email),
    isContributor ? repo.findContributorStatsByEmail(db, profile.email) : null,
    repo.findMemberEarnedBadges(db, profile.id).catch(() => []),
  ]);
  profile.recent_comments = recentComments;
  profile.comment_count = commentCount;
  profile.contributor_stats = contributorStats;
  profile.badges = earnedBadges;

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

// GET /api/member/ambassador-profile — the logged-in member's Ambassador
// application details + badge history, for the dedicated Ambassador page.
const getAmbassadorProfile = asyncHandler(async (req, res) => {
  const db = req.db;
  if (!req.session.member_logged_in) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
  const profile = await repo.findAmbassadorFullProfileByEmail(db, req.session.member_email);
  if (!profile) return res.status(404).json({ status: 'error', message: 'Not an approved Ambassador.' });
  return res.json({ status: 'success', ambassador: profile });
});

// POST /api/member/profile/update
const updateProfile = asyncHandler(async (req, res) => {
  const db = req.db;
  if (!req.session.member_logged_in) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
  const { name, phone, location, country, state, company_name, job_role, headline, bio, linkedin, expertise_tags, sap_certifications, receive_blog_emails, profile_visibility } = req.body || {};

  let profileImage = null;
  if (req.file) {
    profileImage = '/uploads/profiles/' + req.file.filename;
  }

  await repo.updateMemberProfile(db, req.session.member_id, {
    name, phone, location, country, state, company_name, job_role, headline, bio, linkedin, expertise_tags, sap_certifications, receive_blog_emails, profile_visibility, profileImage,
  });

  // Sync profile image to contributor/user account (same email) so both portals show the same photo
  if (profileImage) {
    const memberRow = await repo.findMemberEmailById(db, req.session.member_id);
    if (memberRow) {
      await repo.syncProfileImageToUserAndContributor(db, memberRow.email, profileImage);
    }
  }

  // Keep Contributor/Ambassador application records in sync with whatever
  // country/state/city the member sets here — they're the same person's
  // location, shown across three different tables.
  if (country !== undefined || state !== undefined || location !== undefined || linkedin !== undefined) {
    const memberRow = await repo.findMemberEmailById(db, req.session.member_id);
    if (memberRow) {
      await repo.syncLocationToContributorAndAmbassador(db, memberRow.email, { country, state, city: location, linkedin });
    }
  }

  if (bio !== undefined) {
    const memberRow = await repo.findMemberEmailById(db, req.session.member_id);
    if (memberRow) {
      await repo.syncBioToContributorAndAmbassador(db, memberRow.email, bio);
    }
  }

  const updated = await repo.findMemberProfileById(db, req.session.member_id);
  const isContributor = await repo.findContributorApprovedByEmail(db, updated.email);
  const [recentArticles, recentComments, commentCount, contributorStats, earnedBadges] = await Promise.all([
    repo.findRecentArticlesByEmail(db, updated.email),
    repo.findRecentCommentsByMember(db, updated.id, updated.email, 5),
    repo.countApprovedCommentsByMember(db, updated.id, updated.email),
    isContributor ? repo.findContributorStatsByEmail(db, updated.email) : null,
    repo.findMemberEarnedBadges(db, updated.id).catch(() => []),
  ]);
  updated.recent_articles = recentArticles;
  updated.articles_count = await repo.countPublishedArticlesByEmail(db, updated.email);
  updated.recent_comments = recentComments;
  updated.comment_count = commentCount;
  updated.contributor_stats = contributorStats;
  updated.badges = earnedBadges;
  updated.is_real_contributor = isContributor;
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

  // Read-only: achievements are granted (and emailed) when they're earned, not when viewed.
  const viewMemberId = req.query.member_id || req.session.member_id || null;

  if (!viewMemberId) {
    // Return all types as locked if no member context
    const types = await repo.findAllAchievementTypes(db);
    return res.json({
      status: 'success',
      achievements: types.map(t => ({ ...t, earned: false, earned_at: null })),
    });
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
  const memberRow = await repo.findMemberEmailAndName(db, member_id);
  if (!memberRow) return res.status(404).json({ status: 'error', message: 'Member not found.' });
  await grantAndNotify(db, member_id, achievement_id, memberRow);
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
  getAmbassadorProfile,
};
