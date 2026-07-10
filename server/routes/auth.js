const router = require('express').Router();
const controller = require('../controllers/authController');
const { rateLimit } = require('../middleware/rateLimit');

router.post('/login', rateLimit('admin_login', 10, 900), controller.login);
router.post('/logout', controller.logout);
router.get(['/verify_session.php', '/verify-session'], controller.verifySession);

module.exports = router;
