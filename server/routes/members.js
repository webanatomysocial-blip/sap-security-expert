const router = require('express').Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const multer = require('multer');
const OTPService = require('../services/OTPService');
const NotificationService = require('../services/NotificationService');
const MailService = require('../services/MailService');
const { getUploadDir } = require('../utils/helpers');
const { rateLimit } = require('../middleware/rateLimit');
const { isSQLite } = require('../db');

// Profile image upload (members)
const profileStorage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, getUploadDir('profiles')),
  filename: (_, file, cb) => {
    const ext = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.mimetype] || 'jpg';
    cb(null, `member_profile_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`);
  },
});
const profileUpload = multer({
  storage: profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => cb(null, ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype)),
});

// POST /api/member/login
router.post('/login', rateLimit('member_login', 10, 900), async (req, res) => {
  const db = req.db;
  const { email: emailInput, password } = req.body || {};

  if (!emailInput || !password) {
    return res.status(400).json({ status: 'error', message: 'Email/Username and password are required.' });
  }

  try {
    // Look up member, user, and contributor records
    const [[memberRows]] = [await db.execute(
      'SELECT * FROM members WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?) LIMIT 1',
      [emailInput, emailInput]
    )];
    let member = memberRows[0] || null;

    const [userRows] = await db.execute(
      'SELECT * FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?) LIMIT 1',
      [emailInput, emailInput]
    );
    let user = userRows[0] || null;

    let contributor = null;
    const [contRows] = await db.execute('SELECT * FROM contributors WHERE LOWER(email) = LOWER(?) LIMIT 1', [emailInput]);
    contributor = contRows[0] || null;

    if (user && !contributor && user.contributor_id) {
      const [cr] = await db.execute('SELECT * FROM contributors WHERE id = ?', [user.contributor_id]);
      contributor = cr[0] || null;
    }

    // Resolve actual email for cross-table lookup
    if (!member && (user || contributor)) {
      const resolvedEmail = (user?.email) || (contributor?.email);
      if (resolvedEmail && resolvedEmail.toLowerCase() !== emailInput.toLowerCase()) {
        const [mr] = await db.execute('SELECT * FROM members WHERE LOWER(email) = LOWER(?) LIMIT 1', [resolvedEmail]);
        member = mr[0] || null;
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
      await db.execute(
        "INSERT INTO members (name, email, password_hash, status, approved_at) VALUES (?, ?, ?, 'approved', CURRENT_TIMESTAMP)",
        [newName, newEmail, passwordHash]
      );
      const [newRows] = await db.execute('SELECT * FROM members WHERE email = ? LIMIT 1', [newEmail]);
      member = newRows[0];
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

    let isContributor = false;
    let adminData = null;
    let permissions = {};

    if (user && user.is_active == 1) {
      isContributor = true;
      const csrf_token = req.session.csrf_token || crypto.randomBytes(32).toString('hex');
      req.session.admin_id = user.id;
      req.session.admin_user = user.username;
      req.session.admin_logged_in = true;
      req.session.role = user.role;
      req.session.is_active = 1;
      req.session.csrf_token = csrf_token;

      const [permRows] = await db.execute('SELECT * FROM user_permissions WHERE user_id = ?', [user.id]);
      if (permRows.length) {
        const p = permRows[0];
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

    // Fetch active subscription (if any)
    const [subRows] = await db.execute(
      "SELECT s.expires_at, p.name as plan_name FROM member_subscriptions s JOIN membership_plans p ON p.id = s.plan_id WHERE s.member_id = ? AND s.status = 'active' AND s.expires_at > NOW() ORDER BY s.expires_at DESC LIMIT 1",
      [member.id]
    ).catch(() => [[]]);
    const subscription = subRows[0] || null;
    if (subscription) {
      req.session.has_premium = true;
      req.session.premium_expires_at = subscription.expires_at;
    }

    return res.json({
      status: 'success',
      is_contributor: isContributor,
      csrf_token: req.session.csrf_token || null,
      admin_user: adminData,
      permissions,
      member: {
        id: member.id, name: member.name, email: member.email,
        profile_image: member.profile_image || null,
        receive_blog_emails: member.receive_blog_emails || 0,
      },
      subscription,
    });
  } catch (err) {
    console.error('[member_login]', err.message);
    return res.status(500).json({ status: 'error', message: 'Login technical error. Please try again.' });
  }
});

// POST /api/member/signup
router.post('/signup', rateLimit('member_signup', 10, 900), async (req, res) => {
  const db = req.db;
  const {
    name, phone, email, location, company_name, job_role, username: rawUsername,
    password, receive_blog_emails = 1, ref_code,
  } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ status: 'error', message: 'Name, email and password are required.' });
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
    const [existing] = await db.execute('SELECT id, status, is_deleted FROM members WHERE email = ? LIMIT 1', [email]);
    if (existing.length) {
      const s = existing[0].status;
      const isDeleted = existing[0].is_deleted;
      if (s === 'deactivated' || isDeleted === 1 || s === 'deleted') {
        return res.status(403).json({
          status: 'deactivated',
          message: 'This account has been deactivated. Please contact the administrator at hello@sapsecurityexpert.com to reactivate it.'
        });
      }
      const msgs = { pending: 'Your signup request is already on our waitlist and pending admin approval.', approved: 'This email is already registered. Please log in.' };
      return res.status(409).json({ status: 'error', message: msgs[s] || 'This email was previously rejected. Contact the administrator.' });
    }

    const [userCheck] = await db.execute('SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1', [email]);
    if (userCheck.length) {
      return res.status(409).json({ status: 'error', message: 'You already have a contributor account with this email. Please use your existing credentials.' });
    }

    // Unique username check
    let username;
    if (rawUsername) {
      username = rawUsername;
      const [u1] = await db.execute('SELECT id FROM members WHERE LOWER(username) = LOWER(?) LIMIT 1', [username]);
      const [u2] = await db.execute('SELECT id FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1', [username]);
      if (u1.length || u2.length) {
        return res.status(409).json({ status: 'error', message: 'The username is already taken. Please choose another one.' });
      }
    } else {
      username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
      for (let i = 0; i < 10; i++) {
        const [u1] = await db.execute('SELECT id FROM members WHERE LOWER(username) = LOWER(?) LIMIT 1', [username]);
        const [u2] = await db.execute('SELECT id FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1', [username]);
        if (!u1.length && !u2.length) break;
        username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + Math.floor(Math.random() * 900 + 100);
      }
    }

    const hash = await bcrypt.hash(password, 10);
    // Generate a unique referral code for this member
    const newRefCode = crypto.randomBytes(5).toString('hex').toUpperCase();

    // Validate the referrer's code if provided
    let referredByCode = null;
    if (ref_code) {
      const [refRows] = await db.execute(
        "SELECT id FROM members WHERE referral_code = ? AND status = 'approved' LIMIT 1",
        [ref_code.toUpperCase()]
      );
      if (refRows.length) referredByCode = ref_code.toUpperCase();
    }

    await db.execute(
      `INSERT INTO members (name, phone, email, username, location, company_name, job_role, password_hash, status, created_at, receive_blog_emails, referral_code, referred_by_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, ?, ?, ?)`,
      [name, phone || null, email, username, location || null, company_name || null, job_role || null, hash, parseInt(receive_blog_emails) || 1, newRefCode, referredByCode]
    );

    const mailService = MailService.getInstance(db);
    const notifier = new NotificationService(mailService);
    notifier.notifyMemberSignupSubmitted(email, name).catch(() => {});

    return res.json({
      status: 'success',
      message: 'You have been added to our community waitlist! An admin will review your profile shortly.',
    });
  } catch (err) {
    console.error('[member_signup]', err.message);
    return res.status(500).json({ status: 'error', message: 'Signup failed. Please try again.' });
  }
});

// GET /api/member/profile
router.get('/profile', async (req, res, next) => {
  const db = req.db;
  if (!req.session.member_logged_in) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
  try {
    const [rows] = await db.execute(
      'SELECT id, name, email, username, phone, location, company_name, job_role, profile_image, receive_blog_emails, profile_visibility, status FROM members WHERE id = ? LIMIT 1',
      [req.session.member_id]
    );
    if (!rows.length) return res.status(404).json({ status: 'error', message: 'Profile not found' });

    const [subRows] = await db.execute(
      "SELECT s.expires_at, p.name as plan_name FROM member_subscriptions s JOIN membership_plans p ON p.id = s.plan_id WHERE s.member_id = ? AND s.status = 'active' AND s.expires_at > NOW() ORDER BY s.expires_at DESC LIMIT 1",
      [req.session.member_id]
    ).catch(() => [[]]);
    const subscription = subRows[0] || null;

    // Determine reputation level
    const [contribRows] = await db.execute(
      "SELECT id FROM contributors WHERE LOWER(email) = LOWER(?) AND status = 'approved' LIMIT 1",
      [rows[0].email]
    ).catch(() => [[]]);
    const reputation_level = contribRows.length ? 'Contributor' : 'Explorer';

    return res.json({ status: 'success', member: { ...rows[0], reputation_level }, subscription });
  } catch (err) {
    return next(err);
  }
});

// POST /api/member/profile/update
router.post('/profile/update', (req, res, next) => {
  profileUpload.single('profile_image')(req, res, (err) => {
    if (err) return res.status(400).json({ status: 'error', message: err.message });
    next();
  });
}, async (req, res, next) => {
  const db = req.db;
  if (!req.session.member_logged_in) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
  const { name, phone, location, company_name, job_role, receive_blog_emails, profile_visibility } = req.body || {};
  try {
    const updates = ['name=?', 'phone=?', 'location=?', 'company_name=?', 'job_role=?', 'receive_blog_emails=?', 'updated_at=CURRENT_TIMESTAMP'];
    const params = [name, phone || null, location || null, company_name || null, job_role || null,
      receive_blog_emails != null ? parseInt(receive_blog_emails) : 1];

    if (profile_visibility) {
      updates.push('profile_visibility=?');
      params.push(typeof profile_visibility === 'string' ? profile_visibility : JSON.stringify(profile_visibility));
    }

    let profileImage = null;
    if (req.file) {
      profileImage = '/uploads/profiles/' + req.file.filename;
      updates.push('profile_image=?');
      params.push(profileImage);
    }

    params.push(req.session.member_id);
    await db.execute(`UPDATE members SET ${updates.join(',')} WHERE id=?`, params);

    // Sync profile image to contributor/user account (same email) so both portals show the same photo
    if (profileImage) {
      const [memberRows] = await db.execute('SELECT email FROM members WHERE id=?', [req.session.member_id]);
      if (memberRows.length) {
        const email = memberRows[0].email;
        await db.execute('UPDATE users SET profile_image=? WHERE LOWER(email)=LOWER(?)', [profileImage, email]).catch(() => {});
        await db.execute(
          'UPDATE contributors SET image=? WHERE id=(SELECT contributor_id FROM users WHERE LOWER(email)=LOWER(?) LIMIT 1)',
          [profileImage, email]
        ).catch(() => {});
      }
    }

    const [rows] = await db.execute(
      'SELECT id, name, email, username, phone, location, company_name, job_role, profile_image, receive_blog_emails, profile_visibility, status FROM members WHERE id = ?',
      [req.session.member_id]
    );
    req.session.member_name = rows[0]?.name || req.session.member_name;
    return res.json({ status: 'success', message: 'Profile updated', member: rows[0] });
  } catch (err) {
    return next(err);
  }
});

// POST /api/member/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ status: 'success' });
  });
});

// Lazy-init achievements tables (idempotent).
// Two MySQL/MariaDB incompatibilities here, both confirmed against a real
// MySQL server:
//  - `id TEXT PRIMARY KEY` -> ERROR 1170, "BLOB/TEXT column 'id' used in key
//    specification without a key length". Achievement IDs are short slugs
//    ('welcome', 'first_comment', etc.), so VARCHAR is correct anyway.
//  - `id INTEGER PRIMARY KEY AUTOINCREMENT` is SQLite-only syntax; MySQL
//    needs AUTO_INCREMENT (with underscore) and no portable single spelling
//    covers both engines, so this one branches on isSQLite like blog_ads.js.
async function ensureAchievementTables(db) {
  await db.execute(`CREATE TABLE IF NOT EXISTS member_achievement_types (
    id VARCHAR(50) PRIMARY KEY,
    label VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(50) NOT NULL,
    color VARCHAR(20) NOT NULL,
    bg VARCHAR(20) NOT NULL,
    criteria TEXT NOT NULL
  )`);
  if (isSQLite) {
    await db.execute(`CREATE TABLE IF NOT EXISTS member_achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      achievement_id TEXT NOT NULL,
      earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      email_sent INTEGER NOT NULL DEFAULT 0,
      UNIQUE(member_id, achievement_id),
      FOREIGN KEY (member_id) REFERENCES members(id)
    )`);
  } else {
    await db.execute(`CREATE TABLE IF NOT EXISTS member_achievements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      member_id INT NOT NULL,
      achievement_id VARCHAR(50) NOT NULL,
      earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      email_sent INT NOT NULL DEFAULT 0,
      UNIQUE(member_id, achievement_id),
      FOREIGN KEY (member_id) REFERENCES members(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }
  // Add email_sent column if it doesn't exist yet (idempotent migration)
  try {
    await db.execute(`ALTER TABLE member_achievements ADD COLUMN email_sent INTEGER NOT NULL DEFAULT 0`);
  } catch (_) { /* column already exists */ }

  // Seed the achievement types (INSERT IGNORE = idempotent).
  // Note: INSERT IGNORE, not SQLite's "INSERT OR IGNORE" — db.js's
  // translateSQL() converts the MySQL spelling to the SQLite one
  // automatically for the SQLite adapter, but only if the code is written
  // in MySQL syntax to begin with. The raw mysql2 driver used in production
  // has no such translation layer, so "INSERT OR IGNORE" is a hard SQL
  // syntax error there (confirmed against a real MySQL server).
  const types = [
    ['welcome',               'Welcome Aboard',        'Joined the SAP Security Expert community',                    'bi-stars',            '#7c3aed', '#faf5ff', 'Join as a member'],
    ['first_comment',         'First Voice',           'Had your first comment approved by the team',                 'bi-chat-heart-fill',  '#0369a1', '#f0f9ff', '1 approved comment'],
    ['100_helpful_comments',  'Community Champion',    'Contributed 100 approved comments to the community',          'bi-trophy-fill',      '#b45309', '#fffbeb', '100 approved comments'],
    ['top_contributor',       'Expert Contributor',    'Recognized as an approved content contributor',               'bi-pen-fill',         '#15803d', '#f0fdf4', 'Become an approved contributor'],
    ['profile_complete',      'Profile Pro',           'Completed your full member profile',                          'bi-person-check-fill','#ee5e42', '#fff5f3', 'Complete all profile fields'],
    ['linkedin_ambassador',   'LinkedIn Ambassador',   'Shared SAP Security Expert content on LinkedIn',              'bi-linkedin',         '#0077b5', '#eff8ff', 'Share on LinkedIn once'],
    ['first_referral',        'Community Builder',     'Successfully referred a member to join the community',        'bi-people-fill',      '#dc2626', '#fef2f2', 'Refer 1 approved member'],
  ];
  for (const [id, label, description, icon, color, bg, criteria] of types) {
    await db.execute(
      `INSERT IGNORE INTO member_achievement_types (id, label, description, icon, color, bg, criteria) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, label, description, icon, color, bg, criteria]
    ).catch(() => {});
  }
}

// Grant an achievement and send email if newly granted
async function grantAndNotify(db, mailer, memberId, achievementId, memberEmail, memberName, siteUrl) {
  // Check if already earned before inserting
  const [existing] = await db.execute(
    'SELECT id, email_sent FROM member_achievements WHERE member_id = ? AND achievement_id = ?',
    [memberId, achievementId]
  );
  if (existing.length) return; // already granted, skip

  await db.execute(
    'INSERT IGNORE INTO member_achievements (member_id, achievement_id, email_sent) VALUES (?, ?, 0)',
    [memberId, achievementId]
  ).catch(() => {});

  // Fetch achievement type details for email
  const [types] = await db.execute(
    'SELECT label, description, icon FROM member_achievement_types WHERE id = ?',
    [achievementId]
  );
  if (!types.length || !memberEmail) return;

  const { label, description, icon } = types[0];
  if (mailer) {
    const sent = await mailer.send(
      memberEmail,
      `🏅 Achievement Unlocked: ${label}`,
      'member/achievement_unlocked',
      {
        name: memberName || 'Member',
        label,
        description,
        icon,
        achievements_url: `${siteUrl}/member/achievements`,
      }
    );
    if (sent) {
      await db.execute(
        'UPDATE member_achievements SET email_sent = 1 WHERE member_id = ? AND achievement_id = ?',
        [memberId, achievementId]
      ).catch(() => {});
    }
  }
}

// GET /api/member/referral — return member's referral code + stats
router.get('/referral', async (req, res, next) => {
  if (!req.session.member_logged_in) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
  const db = req.db;
  const memberId = req.session.member_id;
  try {
    const [rows] = await db.execute('SELECT referral_code FROM members WHERE id = ? LIMIT 1', [memberId]);
    if (!rows.length) return res.status(404).json({ status: 'error', message: 'Member not found' });

    let code = rows[0].referral_code;
    // Generate a code if somehow missing (backfill)
    if (!code) {
      const crypto = require('crypto');
      code = crypto.randomBytes(5).toString('hex').toUpperCase();
      await db.execute('UPDATE members SET referral_code = ? WHERE id = ?', [code, memberId]);
    }

    const [countRows] = await db.execute(
      "SELECT COUNT(*) as cnt FROM members WHERE referred_by_code = ? AND status = 'approved'",
      [code]
    );
    const siteUrl = (process.env.SITE_URL || 'http://dev.sapsecurityexpert.com').replace(/\/$/, '');

    return res.json({
      status: 'success',
      referral_code: code,
      referral_link: `${siteUrl}/member/signup?ref=${code}`,
      referrals_count: countRows[0]?.cnt || 0,
    });
  } catch (err) {
    return next(err);
  }
});

// GET /api/member/achievements — works with session or ?member_id param
router.get('/achievements', async (req, res, next) => {
  const db = req.db;
  try {
    await ensureAchievementTables(db);

    // Only use session member_id for auto-grant/email logic.
    // ?member_id= (public profile view) gets read-only data with no side-effects.
    const sessionMemberId = req.session.member_id || null;
    const viewMemberId = req.query.member_id || sessionMemberId;

    if (!viewMemberId) {
      // Return all types as locked if no member context
      const [types] = await db.execute('SELECT * FROM member_achievement_types ORDER BY id');
      return res.json({
        status: 'success',
        achievements: types.map(t => ({ ...t, earned: false, earned_at: null })),
      });
    }

    // Only run auto-grant and send emails for the authenticated member's own profile
    const memberId = sessionMemberId;

    // Fetch member info for email notifications (only needed when member is logged in)
    const [memberRows] = memberId
      ? await db.execute('SELECT email, name FROM members WHERE id = ?', [memberId])
      : [[]];

    const memberEmail = memberRows[0]?.email || null;
    const memberName = memberRows[0]?.name || 'Member';
    const siteUrl = (process.env.SITE_URL || 'http://dev.sapsecurityexpert.com').replace(/\/$/, '');
    const mailer = MailService.getInstance(db);

    // Auto-grant logic only runs for the authenticated member's own session
    if (memberId) {
      await grantAndNotify(db, mailer, memberId, 'welcome', memberEmail, memberName, siteUrl);

      const [commentRows] = await db.execute(
        "SELECT COUNT(*) as cnt FROM comments WHERE member_id = ? AND status = 'approved'",
        [memberId]
      );
      const commentCount = commentRows[0]?.cnt || 0;
      if (commentCount >= 1) {
        await grantAndNotify(db, mailer, memberId, 'first_comment', memberEmail, memberName, siteUrl);
      }
      if (commentCount >= 100) {
        await grantAndNotify(db, mailer, memberId, '100_helpful_comments', memberEmail, memberName, siteUrl);
      }

      if (memberRows[0]?.email) {
        const [contribRows] = await db.execute(
          "SELECT id FROM contributors WHERE LOWER(email) = LOWER(?) AND status = 'approved' LIMIT 1",
          [memberRows[0].email]
        );
        if (contribRows.length) {
          await grantAndNotify(db, mailer, memberId, 'top_contributor', memberEmail, memberName, siteUrl);
        }
      }

      const [profBonusRows] = await db.execute(
        "SELECT id FROM credit_transactions WHERE member_id = ? AND note = 'Complete profile bonus' LIMIT 1",
        [memberId]
      );
      if (profBonusRows.length) {
        await grantAndNotify(db, mailer, memberId, 'profile_complete', memberEmail, memberName, siteUrl);
      }

      const [linkedinRows] = await db.execute(
        "SELECT id FROM credit_transactions WHERE member_id = ? AND note = 'LinkedIn share bonus' LIMIT 1",
        [memberId]
      );
      if (linkedinRows.length) {
        await grantAndNotify(db, mailer, memberId, 'linkedin_ambassador', memberEmail, memberName, siteUrl);
      }

      const [memberReferralCode] = await db.execute(
        'SELECT referral_code FROM members WHERE id = ? LIMIT 1', [memberId]
      );
      if (memberReferralCode[0]?.referral_code) {
        const [refRows] = await db.execute(
          "SELECT COUNT(*) as cnt FROM members WHERE referred_by_code = ? AND status = 'approved'",
          [memberReferralCode[0].referral_code]
        );
        if ((refRows[0]?.cnt || 0) >= 1) {
          await grantAndNotify(db, mailer, memberId, 'first_referral', memberEmail, memberName, siteUrl);
        }
      }
    }

    // Fetch all types + earned status for whichever member is being viewed
    const [types] = await db.execute('SELECT * FROM member_achievement_types ORDER BY id');
    const [earned] = await db.execute(
      'SELECT achievement_id, earned_at FROM member_achievements WHERE member_id = ?',
      [viewMemberId]
    );
    const earnedMap = {};
    earned.forEach(r => { earnedMap[r.achievement_id] = r.earned_at; });

    const achievements = types.map(t => ({
      ...t,
      earned: !!earnedMap[t.id],
      earned_at: earnedMap[t.id] || null,
    }));

    return res.json({ status: 'success', achievements });
  } catch (err) {
    return next(err);
  }
});

// POST /api/member/achievements/grant — admin-only manual grant
const { requireAdmin } = require('../middleware/auth');
router.post('/achievements/grant', requireAdmin, async (req, res, next) => {
  const db = req.db;
  const { member_id, achievement_id } = req.body || {};
  if (!member_id || !achievement_id) {
    return res.status(400).json({ status: 'error', message: 'member_id and achievement_id are required.' });
  }
  try {
    await ensureAchievementTables(db);
    const [memberRows] = await db.execute('SELECT email, name FROM members WHERE id = ?', [member_id]);
    const memberEmail = memberRows[0]?.email || null;
    const memberName = memberRows[0]?.name || 'Member';
    const siteUrl = (process.env.SITE_URL || 'http://dev.sapsecurityexpert.com').replace(/\/$/, '');
    const mailer = MailService.getInstance(db);
    await grantAndNotify(db, mailer, member_id, achievement_id, memberEmail, memberName, siteUrl);
    return res.json({ status: 'success', message: 'Achievement granted.' });
  } catch (err) {
    return next(err);
  }
});

// POST /api/member/change-password
router.post('/change-password', rateLimit('member_change_password', 5, 900), async (req, res, next) => {
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
  try {
    const [rows] = await db.execute(
      'SELECT id, email, password_hash FROM members WHERE id = ?',
      [req.session.member_id]
    );
    if (!rows.length) return res.status(404).json({ status: 'error', message: 'Member not found.' });
    const member = rows[0];

    const match = await bcrypt.compare(current_password, member.password_hash);
    if (!match) return res.status(400).json({ status: 'error', message: 'Current password is incorrect.' });

    const hash = await bcrypt.hash(new_password, 10);

    // Update members table
    await db.execute('UPDATE members SET password_hash=? WHERE id=?', [hash, member.id]);

    // Sync to users table if contributor/admin account shares this email
    await db.execute(
      'UPDATE users SET password=? WHERE LOWER(email)=LOWER(?)',
      [hash, member.email]
    ).catch(err => console.error('[change-password] users sync failed:', err.message));

    return res.json({ status: 'success', message: 'Password changed successfully.' });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
