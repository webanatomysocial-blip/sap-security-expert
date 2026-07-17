const router = require('express').Router();
const { rateLimit } = require('../middleware/rateLimit');
const { requireMemberAuth, requireCsrf } = require('../middleware/auth');
const controller = require('../controllers/paymentsController');

router.get('/bundles', controller.bundles);
router.get('/my-credits', requireMemberAuth, controller.myCredits);
router.get('/my-unlocks', requireMemberAuth, controller.myUnlocks);
router.get('/my-transactions', requireMemberAuth, controller.myTransactions);
router.get('/invoice/:txId', requireMemberAuth, controller.invoice);
router.post('/validate-coupon', rateLimit('coupon_validate', 20, 60), requireMemberAuth, requireCsrf, controller.validateCoupon);
router.post('/create-order', rateLimit('create_order', 10, 60), requireMemberAuth, requireCsrf, controller.createOrder);
router.post('/verify', rateLimit('payment_verify', 10, 60), requireMemberAuth, requireCsrf, controller.verify);
router.post('/unlock-blog', rateLimit('unlock_blog', 20, 60), requireMemberAuth, requireCsrf, controller.unlockBlog);
// Webhook is server-to-server (Razorpay), authenticated via HMAC signature —
// no browser session/cookie involved, so CSRF doesn't apply here.
router.post('/webhook', controller.webhook);
router.post('/linkedin-bonus', rateLimit('linkedin_bonus', 3, 3600), requireMemberAuth, requireCsrf, controller.linkedinBonus);
router.post('/complete-profile-bonus', rateLimit('profile_bonus', 3, 3600), requireMemberAuth, requireCsrf, controller.completeProfileBonus);
router.post('/report-error', rateLimit('report_error', 5, 3600), requireMemberAuth, requireCsrf, controller.reportError);
router.post('/product-review-bonus', rateLimit('product_review', 10, 3600), requireMemberAuth, requireCsrf, controller.productReviewBonus);
router.post('/download-file', rateLimit('download_file', 30, 3600), requireMemberAuth, requireCsrf, controller.downloadFile);
router.get('/my-downloads', requireMemberAuth, controller.myDownloads);

module.exports = router;
