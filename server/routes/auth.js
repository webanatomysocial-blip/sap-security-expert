const router = require('express').Router();
const controller = require('../controllers/authController');

router.post('/login', controller.login);
router.post('/logout', controller.logout);
router.get(['/verify_session.php', '/verify-session'], controller.verifySession);

module.exports = router;
