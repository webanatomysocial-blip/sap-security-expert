/**
 * RBAC permission middleware.
 */

function checkPermission(key) {
  return (req, res, next) => {
    const sess = req.session;

    // Admins bypass all permission checks
    if (sess.role === 'admin') return next();

    // is_active guard
    if (!sess.is_active || sess.is_active != 1) {
      return res.status(403).json({
        status: 'error',
        message: 'Account is deactivated. Contact administrator.',
      });
    }

    const perms = sess.permissions || {};
    if (!perms[key]) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You do not have permission to perform this action.',
      });
    }

    next();
  };
}

const buildPermissions = (p) => p ? {
  can_manage_blogs: !!p.can_manage_blogs,
  can_manage_ads: !!p.can_manage_ads,
  can_manage_comments: !!p.can_manage_comments,
  can_manage_announcements: !!p.can_manage_announcements,
  can_review_blogs: !!(p.can_review_blogs || 0),
  can_access_premium_articles: !!(p.can_access_premium_articles || 0),
} : {};

// Permissions are copied into the session at login, so an admin revoking one
// (e.g. premium-article access) would otherwise only take effect after the
// contributor logs out. Re-read them from the DB on every request for
// non-admin staff sessions. Fails closed: if the lookup errors, no permissions.
async function refreshStaffPermissions(req, res, next) {
  const sess = req.session;
  if (!sess?.admin_logged_in || !sess.admin_id || sess.role === 'admin' || !req.db) return next();
  try {
    const [[user]] = await req.db.execute('SELECT role, is_active FROM users WHERE id = ? LIMIT 1', [sess.admin_id]);
    const [[perm]] = await req.db.execute('SELECT * FROM user_permissions WHERE user_id = ? LIMIT 1', [sess.admin_id]);
    sess.is_active = user ? user.is_active : 0;
    sess.permissions = user && Number(user.is_active) === 1 ? buildPermissions(perm) : {};
  } catch (err) {
    console.error('[refreshStaffPermissions]', err.message);
    sess.permissions = {};
  }
  next();
}

module.exports = { checkPermission, buildPermissions, refreshStaffPermissions };
