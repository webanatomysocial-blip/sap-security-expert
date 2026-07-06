const router = require('express').Router();
const { rateLimit } = require('../middleware/rateLimit');
const controller = require('../controllers/otpController');

router.post(['/send_otp.php', '/send-otp'], rateLimit('otp_send', 5, 300), controller.sendOtp);
router.post(['/verify_otp.php', '/verify-otp'], rateLimit('otp_verify', 10, 300), controller.verifyOtp);
router.post(['/forgot_password.php', '/forgot-password'], rateLimit('forgot_password', 5, 300), controller.forgotPassword);
router.post(['/reset_with_token.php', '/reset-with-token'], rateLimit('reset_token', 10, 300), controller.resetWithToken);
router.post(['/reset_password_otp.php', '/reset-password-otp'], rateLimit('reset_otp', 10, 300), controller.resetPasswordOtp);

module.exports = router;
