const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { asyncHandler } = require('../utils/asyncHandler');
const AuditService = require('../services/AuditService');
const repo = require('../repositories/authRepository');

const buildPermissions = (p) => p ? {
  can_manage_blogs: !!p.can_manage_blogs,
  can_manage_ads: !!p.can_manage_ads,
  can_manage_comments: !!p.can_manage_comments,
  can_manage_announcements: !!p.can_manage_announcements,
  can_review_blogs: !!(p.can_review_blogs || 0),
  can_access_premium_articles: !!(p.can_access_premium_articles || 0),
} : {};

// POST /api/login
// Kept as an explicit try/catch (not asyncHandler/next(err)) rather than
// centralized: this route's outer catch returns a specific, already-safe
// custom message ("Something went wrong while connecting to the system.")
// which differs from the central handler's generic "Internal server error"
// — centralizing it would silently change this response's exact text.
const login = async (req, res) => {
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

    const attempt = await repo.findLoginAttempts(db, ip);
    if (attempt && attempt.attempts >= maxAttempts && (now - attempt.last_attempt) < lockoutTime) {
      const remaining = lockoutTime - (now - attempt.last_attempt);
      return res.status(429).json({
        status: 'error',
        message: `Too many login attempts. Please try again in ${Math.ceil(remaining / 60)} minutes.`,
      });
    }

    const user = await repo.findUserByUsername(db, username);

    if (user && await bcrypt.compare(password, user.password)) {
      if (user.role !== 'admin') {
        return res.status(403).json({ status: 'error', message: 'Contributors must login via the Member Login page.' });
      }
      if (user.is_active == 0) {
        return res.status(403).json({ status: 'error', message: 'Account is deactivated. Contact administrator.' });
      }

      // Build permissions — silently degrade to {} if user_permissions
      // doesn't exist or the lookup fails; login should still succeed.
      let permissions = {};
      try {
        const p = await repo.findPermissionsByUserId(db, user.id);
        if (p) {
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

      await repo.clearLoginAttempts(db, ip);
      await audit.log({ userId: user.id, actor: user.username, action: 'login_success', targetType: 'user', targetId: user.id, ip });

      return res.json({
        status: 'success',
        message: 'Login successful',
        csrf_token,
        role: user.role,
        permissions,
        user: { id: user.id, username: user.username, role: user.role, avatar: user.avatar || null },
      });
    } else {
      await repo.recordFailedAttempt(db, ip, now);
      await audit.log({ userId: null, actor: username, action: 'login_failure', targetType: 'user', targetId: username, ip });
      return res.status(401).json({ status: 'error', message: 'The username or password you entered is incorrect.' });
    }
  } catch (err) {
    console.error('[login]', err.message);
    return res.status(500).json({ status: 'error', message: 'Something went wrong while connecting to the system.' });
  }
};

// POST /api/logout
const logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ status: 'success', message: 'Logged out' });
  });
};

// GET /api/verify-session
// Both branches below intentionally swallow their own errors and fall
// through to the final 401 — preserved exactly as before (graceful
// degrade to "not authenticated" on a DB hiccup rather than a 500).
const verifySession = asyncHandler(async (req, res) => {
  const db = req.db;
  const sess = req.session;

  if (sess.admin_logged_in) {
    try {
      const user = await repo.findUserById(db, sess.admin_id);
      if (user) {
        const p = await repo.findPermissionsByUserIdAll(db, sess.admin_id);
        const permissions = buildPermissions(p);
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
      const user = await repo.findContributorByEmail(db, sess.member_email);
      if (user) {
        const csrf_token = sess.csrf_token || crypto.randomBytes(32).toString('hex');
        sess.admin_id = user.id;
        sess.admin_user = user.username;
        sess.admin_logged_in = true;
        sess.role = user.role;
        sess.is_active = user.is_active;
        sess.csrf_token = csrf_token;

        const p = await repo.findPermissionsByUserIdAll(db, user.id);
        const permissions = buildPermissions(p);
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

module.exports = { login, logout, verifySession };
