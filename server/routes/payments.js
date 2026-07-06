const router = require('express').Router();
const { rateLimit } = require('../middleware/rateLimit');
const controller = require('../controllers/paymentsController');

router.get('/bundles', controller.bundles);
router.get('/my-credits', controller.myCredits);
router.get('/my-unlocks', controller.myUnlocks);
router.get('/my-transactions', controller.myTransactions);
router.get('/invoice/:txId', controller.invoice);
router.post('/validate-coupon', rateLimit('coupon_validate', 20, 60), controller.validateCoupon);
router.post('/create-order', rateLimit('create_order', 10, 60), controller.createOrder);
router.post('/verify', rateLimit('payment_verify', 10, 60), controller.verify);
router.post('/unlock-blog', rateLimit('unlock_blog', 20, 60), controller.unlockBlog);
router.post('/webhook', controller.webhook);
router.post('/linkedin-bonus', rateLimit('linkedin_bonus', 3, 3600), controller.linkedinBonus);
router.post('/complete-profile-bonus', rateLimit('profile_bonus', 3, 3600), controller.completeProfileBonus);
router.post('/report-error', rateLimit('report_error', 5, 3600), controller.reportError);
router.post('/product-review-bonus', rateLimit('product_review', 10, 3600), controller.productReviewBonus);

module.exports = router;
