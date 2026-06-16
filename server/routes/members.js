const router = require('express').Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const multer = require('multer');
const OTPService = require('../services/OTPService');
const NotificationService = require('../services/NotificationService');
const MailService = require('../services/MailService');
const { getUploadDir } = require('../utils/helpers');

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
router.post('/login', async (req, res) => {
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
router.post('/signup', async (req, res) => {
  const db = req.db;
  const {
    name, phone, email, location, company_name, job_role, username: rawUsername,
    password, receive_blog_emails = 1,
  } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ status: 'error', message: 'Name, email and password are required.' });
  }

  const otpService = new OTPService(db);
  if (!await otpService.isVerified(email, 'signup')) {
    return res.status(403).json({ status: 'error', message: 'Email not verified. Please verify your email with OTP first.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ status: 'error', message: 'Please enter a valid email address.' });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ status: 'error', message: 'Password must be at least 8 characters.' });
  }

  try {
    const [existing] = await db.execute('SELECT id, status FROM members WHERE email = ? LIMIT 1', [email]);
    if (existing.length) {
      const s = existing[0].status;
      const msgs = { pending: 'Your signup request is already on our waitlist and pending admin approval.', approved: 'This email is already registered. Please log in.' };
      return res.status(409).json({ status: 'error', message: msgs[s] || 'This email was previously rejected. Contact the administrator.' });
    }

    const [userCheck] = await db.execute('SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1', [email]);
    if (userCheck.length) {
      return res.status(409).json({ status: 'error', message: 'You already have a contributor account with this email. Please use your existing credentials.' });
    }

    // Generate unique username
    let username = rawUsername || email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
    for (let i = 0; i < 5; i++) {
      const [u1] = await db.execute('SELECT id FROM members WHERE LOWER(username) = LOWER(?) LIMIT 1', [username]);
      const [u2] = await db.execute('SELECT id FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1', [username]);
      if (!u1.length && !u2.length) break;
      username = (rawUsername || username.replace(/\d+$/, '')) + Math.floor(Math.random() * 900 + 100);
    }

    const hash = await bcrypt.hash(password, 10);
    await db.execute(
      `INSERT INTO members (name, phone, email, username, location, company_name, job_role, password_hash, status, created_at, receive_blog_emails)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, ?)`,
      [name, phone || null, email, username, location || null, company_name || null, job_role || null, hash, parseInt(receive_blog_emails)]
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
    return res.status(500).json({ status: 'error', message: 'Server error: ' + err.message });
  }
});

// GET /api/member/profile
router.get('/profile', async (req, res) => {
  const db = req.db;
  if (!req.session.member_logged_in) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
  try {
    const [rows] = await db.execute(
      'SELECT id, name, email, username, phone, location, company_name, job_role, profile_image, receive_blog_emails, status FROM members WHERE id = ? LIMIT 1',
      [req.session.member_id]
    );
    if (!rows.length) return res.status(404).json({ status: 'error', message: 'Profile not found' });

    const [subRows] = await db.execute(
      "SELECT s.expires_at, p.name as plan_name FROM member_subscriptions s JOIN membership_plans p ON p.id = s.plan_id WHERE s.member_id = ? AND s.status = 'active' AND s.expires_at > NOW() ORDER BY s.expires_at DESC LIMIT 1",
      [req.session.member_id]
    ).catch(() => [[]]);
    const subscription = subRows[0] || null;

    return res.json({ status: 'success', member: rows[0], subscription });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/member/profile/update
router.post('/profile/update', (req, res, next) => {
  profileUpload.single('profile_image')(req, res, (err) => {
    if (err) return res.status(400).json({ status: 'error', message: err.message });
    next();
  });
}, async (req, res) => {
  const db = req.db;
  if (!req.session.member_logged_in) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
  const { name, phone, location, company_name, job_role, receive_blog_emails } = req.body || {};
  try {
    const updates = ['name=?', 'phone=?', 'location=?', 'company_name=?', 'job_role=?', 'receive_blog_emails=?', 'updated_at=CURRENT_TIMESTAMP'];
    const params = [name, phone || null, location || null, company_name || null, job_role || null,
      receive_blog_emails != null ? parseInt(receive_blog_emails) : 1];

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

    const [rows] = await db.execute('SELECT * FROM members WHERE id = ?', [req.session.member_id]);
    req.session.member_name = rows[0]?.name || req.session.member_name;
    return res.json({ status: 'success', message: 'Profile updated', member: rows[0] });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/member/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ status: 'success' });
  });
});

module.exports = router;
