const router = require('express').Router();
const { rateLimit } = require('../middleware/rateLimit');
const controller = require('../controllers/otpController');

router.post('/send-otp', rateLimit('otp_send', 5, 300), controller.sendOtp);
router.post('/verify-otp', rateLimit('otp_verify', 10, 300), controller.verifyOtp);
router.post('/forgot-password', rateLimit('forgot_password', 5, 300), controller.forgotPassword);
router.post('/reset-with-token', rateLimit('reset_token', 10, 300), controller.resetWithToken);
router.post('/reset-password-otp', rateLimit('reset_otp', 10, 300), controller.resetPasswordOtp);

module.exports = router;
