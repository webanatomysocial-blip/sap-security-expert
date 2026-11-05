const router = require('express').Router();
const controller = require('../controllers/authController');
const { rateLimit } = require('../middleware/rateLimit');
const { requireSessionCsrf } = require('../middleware/auth');
const crypto = require('crypto');

// Issues the token a login form must send. Works for anonymous visitors.
router.get('/csrf-token', (req, res) => {
  if (!req.session.csrf_token) req.session.csrf_token = crypto.randomBytes(32).toString('hex');
  res.json({ status: 'success', csrf_token: req.session.csrf_token });
});
router.post('/login', rateLimit('admin_login', 10, 900), requireSessionCsrf({ mode: 'login' }), controller.login);
router.post('/logout', requireSessionCsrf({ mode: 'logout' }), controller.logout);
router.get('/verify-session', controller.verifySession);

module.exports = router;
