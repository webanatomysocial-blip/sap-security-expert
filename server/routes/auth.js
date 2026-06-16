const router = require('express').Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const AuditService = require('../services/AuditService');

// POST /api/login
router.post('/login', async (req, res) => {
  const db = req.db;
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ status: 'error', message: 'Please enter both username and password.' });
  }

  try {
    const audit = new AuditService(db);
    const ip = req.ip;
    const now = Math.floor(Date.now() / 1000);
    const lockoutTime = 900;
    const maxAttempts = 5;

    const [attempts] = await db.execute('SELECT attempts, last_attempt FROM login_attempts WHERE ip = ?', [ip]);
    if (attempts.length && attempts[0].attempts >= maxAttempts && (now - attempts[0].last_attempt) < lockoutTime) {
      const remaining = lockoutTime - (now - attempts[0].last_attempt);
      return res.status(429).json({
        status: 'error',
        message: `Too many login attempts. Please try again in ${Math.ceil(remaining / 60)} minutes.`,
      });
    }

    const [users] = await db.execute('SELECT * FROM users WHERE username = ? LIMIT 1', [username]);
    const user = users[0];

    if (user && await bcrypt.compare(password, user.password)) {
      if (user.role !== 'admin') {
        return res.status(403).json({ status: 'error', message: 'Contributors must login via the Member Login page.' });
      }
      if (user.is_active == 0) {
        return res.status(403).json({ status: 'error', message: 'Account is deactivated. Contact administrator.' });
      }

      // Build permissions
      let permissions = {};
      try {
        const [permRows] = await db.execute('SELECT * FROM user_permissions WHERE user_id = ? LIMIT 1', [user.id]);
        if (permRows.length) {
          const p = permRows[0];
          permissions = {
            can_manage_blogs: !!p.can_manage_blogs,
            can_manage_ads: !!p.can_manage_ads,
            can_manage_comments: !!p.can_manage_comments,
            can_manage_announcements: !!p.can_manage_announcements,
            can_review_blogs: !!(p.can_review_blogs || 0),
          };
        }
      } catch { /* user_permissions may not exist */ }

      const csrf_token = crypto.randomBytes(32).toString('hex');

      req.session.admin_logged_in = true;
      req.session.admin_id = user.id;
      req.session.admin_user = user.username;
      req.session.role = user.role || 'admin';
      req.session.is_active = user.is_active ?? 1;
      req.session.permissions = permissions;
      req.session.csrf_token = csrf_token;

      await db.execute('DELETE FROM login_attempts WHERE ip = ?', [ip]);
      await audit.log(user.id, 'login_success', 'user', user.id, `IP: ${ip}`);

      return res.json({
        status: 'success',
        message: 'Login successful',
        csrf_token,
        role: user.role,
        permissions,
        user: { id: user.id, username: user.username, role: user.role, avatar: user.avatar || null },
      });
    } else {
      // Increment attempts
      const [existingAttempt] = await db.execute('SELECT ip FROM login_attempts WHERE ip = ?', [ip]);
      if (existingAttempt.length) {
        await db.execute('UPDATE login_attempts SET attempts = attempts + 1, last_attempt = ? WHERE ip = ?', [now, ip]);
      } else {
        await db.execute('INSERT INTO login_attempts (ip, attempts, last_attempt) VALUES (?, 1, ?)', [ip, now]);
      }
      await audit.log(null, 'login_failure', 'user', username, `IP: ${ip}`);
      return res.status(401).json({ status: 'error', message: 'The username or password you entered is incorrect.' });
    }
  } catch (err) {
    console.error('[login]', err.message);
    return res.status(500).json({ status: 'error', message: 'Something went wrong while connecting to the system.' });
  }
});

// POST /api/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ status: 'success', message: 'Logged out' });
  });
});

// GET /api/verify_session.php  (also mounted as /verify-session)
router.get(['/verify_session.php', '/verify-session'], async (req, res) => {
  const db = req.db;
  const sess = req.session;

  const buildPermissions = (p) => p ? {
    can_manage_blogs: !!p.can_manage_blogs,
    can_manage_ads: !!p.can_manage_ads,
    can_manage_comments: !!p.can_manage_comments,
    can_manage_announcements: !!p.can_manage_announcements,
    can_review_blogs: !!(p.can_review_blogs || 0),
  } : {};

  if (sess.admin_logged_in) {
    try {
      const [rows] = await db.execute(
        'SELECT id, username, role, full_name, profile_image FROM users WHERE id = ? LIMIT 1',
        [sess.admin_id]
      );
      if (rows.length) {
        const user = rows[0];
        const [permRows] = await db.execute('SELECT * FROM user_permissions WHERE user_id = ?', [sess.admin_id]);
        const permissions = buildPermissions(permRows[0]);
        return res.json({
          status: 'success',
          authenticated: true,
          user: { id: user.id, username: user.username, role: user.role, full_name: user.full_name, profile_image: user.profile_image },
          permissions,
          csrf_token: sess.csrf_token,
        });
      }
    } catch (err) {
      console.error('[verify_session]', err.message);
    }
  } else if (sess.member_logged_in) {
    // Contributor auto-login
    try {
      const [rows] = await db.execute(
        "SELECT * FROM users WHERE email = ? AND role = 'contributor' AND is_active = 1 LIMIT 1",
        [sess.member_email]
      );
      if (rows.length) {
        const user = rows[0];
        const csrf_token = sess.csrf_token || require('crypto').randomBytes(32).toString('hex');
        sess.admin_id = user.id;
        sess.admin_user = user.username;
        sess.admin_logged_in = true;
        sess.role = user.role;
        sess.is_active = user.is_active;
        sess.csrf_token = csrf_token;

        const [permRows] = await db.execute('SELECT * FROM user_permissions WHERE user_id = ?', [user.id]);
        const permissions = buildPermissions(permRows[0]);
        sess.permissions = permissions;

        return res.json({
          status: 'success',
          authenticated: true,
          user: { id: user.id, username: user.username, role: user.role },
          permissions,
          csrf_token,
        });
      }
    } catch (err) {
      console.error('[verify_session contributor]', err.message);
    }
  }

  return res.status(401).json({ status: 'error', authenticated: false, message: 'Not authenticated' });
});

module.exports = router;
