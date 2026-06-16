/**
 * Session guard + CSRF validator.
 * Mirrors api/auth_check.php behaviour exactly.
 */

function requireAuth(options = {}) {
  const allowPublic = options.allowPublic || false;

  return (req, res, next) => {
    const sess = req.session;

    // 1. Authentication check
    if (!sess.admin_logged_in) {
      if (!allowPublic) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized. Please log in.' });
      }
    }

    // 2. Per-request is_active check
    if (sess.admin_logged_in && sess.is_active == 0) {
      req.session.destroy(() => {});
      return res.status(403).json({
        status: 'error',
        message: 'Account has been deactivated. Contact administrator.',
      });
    }

    // 3. CSRF validation for mutating methods
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      const csrfToken =
        req.headers['x-csrf-token'] ||
        (req.body && req.body.csrf_token) ||
        '';

      if (!sess.csrf_token || csrfToken !== sess.csrf_token) {
        return res.status(403).json({
          status: 'error',
          message: 'Your session is invalid or expired. Please refresh the page. (CSRF validation failed)',
        });
      }
    }

    next();
  };
}

// Short-hand: require admin-only
function requireAdmin(req, res, next) {
  if (!req.session.admin_logged_in) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized. Please log in.' });
  }
  if (req.session.role !== 'admin') {
    return res.status(403).json({ status: 'error', message: 'Admin access required.' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
