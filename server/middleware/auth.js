const { timingSafeEqual } = require('crypto');
const authRepo = require('../repositories/authRepository');
const { asyncHandler } = require('../utils/asyncHandler');

function safeCompare(a, b) {
  try {
    const ba = Buffer.from(String(a), 'utf8');
    const bb = Buffer.from(String(b), 'utf8');
    return ba.length === bb.length && timingSafeEqual(ba, bb);
  } catch { return false; }
}

function requireAuth(options = {}) {
  const allowPublic = options.allowPublic || false;

  // Wrapped with asyncHandler: this is registered directly as Express
  // middleware (not awaited/caught by Express itself), so an unhandled
  // rejection from the DB call below (e.g. a transient pool/connection
  // error) would otherwise become an unhandled promise rejection and crash
  // the entire Node process for every in-flight request, not just this one.
  return asyncHandler(async (req, res, next) => {
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

    // 2b. Re-validate role/active state against the DB. Session fields are
    // cached at login and don't change when an admin deletes/deactivates a
    // contributor mid-session elsewhere — without this, that stale session
    // keeps dashboard access until it naturally expires.
    if (sess.admin_logged_in) {
      const current = await authRepo.findCurrentAccessState(req.db, sess.admin_id);
      const stillHasDashboardAccess = current && current.is_active == 1 && (current.role === 'admin' || current.role === 'contributor');
      if (!stillHasDashboardAccess) {
        req.session.destroy(() => {});
        return res.status(403).json({
          status: 'error',
          message: 'Your access has been revoked. Please log in again.',
        });
      }
      // Keep the cached session role in sync with the DB. Without this, an
      // admin who gets demoted to contributor mid-session keeps full admin
      // access (requireAdmin and checkPermission both trust sess.role
      // directly) until they happen to log out and back in.
      if (sess.role !== current.role) sess.role = current.role;
    }

    // 3. CSRF validation for mutating methods (timing-safe comparison)
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      const csrfToken =
        req.headers['x-csrf-token'] ||
        (req.body && req.body.csrf_token) ||
        '';

      if (!sess.csrf_token || !safeCompare(csrfToken, sess.csrf_token)) {
        return res.status(403).json({
          status: 'error',
          message: 'Your session is invalid or expired. Please refresh the page. (CSRF validation failed)',
        });
      }
    }

    next();
  });
}

// Short-hand: require admin-only
function requireAdmin(req, res, next) {
  requireAuth()(req, res, (err) => {
    if (err) return next(err);
    if (req.session.role !== 'admin') {
      return res.status(403).json({ status: 'error', message: 'Admin access required.' });
    }
    next();
  });
}

// Member authentication + deactivation guard — use on all member-facing routes
// that require a logged-in member (payments, profile mutations, etc.).
function requireMemberAuth(req, res, next) {
  const sess = req.session;
  if (!sess.member_logged_in) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized. Please log in.' });
  }
  // Guard fires when status is explicitly set AND is not 'approved'.
  // Sessions from before member_status was added have undefined here — those
  // are treated as valid (approved) until the member logs out and back in.
  // The only values that trigger immediate revocation are known bad states.
  const blockedStatuses = new Set(['suspended', 'deactivated', 'deleted', 'banned']);
  if (blockedStatuses.has(sess.member_status)) {
    req.session.destroy(() => {});
    return res.status(403).json({ status: 'error', message: 'Account has been deactivated.' });
  }
  next();
}

// CSRF check only, no admin session requirement — for member/payment mutating
// routes, which authenticate via req.session.member_logged_in instead of
// req.session.admin_logged_in. Requires the member to already be logged in
// (session.csrf_token is only set at member/admin login).
function requireCsrf(req, res, next) {
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) return next();

  const sess = req.session;
  const csrfToken =
    req.headers['x-csrf-token'] ||
    (req.body && req.body.csrf_token) ||
    '';

  if (!sess.csrf_token || !safeCompare(csrfToken, sess.csrf_token)) {
    return res.status(403).json({
      status: 'error',
      message: 'Your session is invalid or expired. Please refresh the page. (CSRF validation failed)',
    });
  }
  next();
}

module.exports = { requireAuth, requireAdmin, requireMemberAuth, requireCsrf, safeCompare };
