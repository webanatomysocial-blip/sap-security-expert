/**
 * RBAC permission middleware.
 * Mirrors api/permission_check.php.
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

module.exports = { checkPermission };
