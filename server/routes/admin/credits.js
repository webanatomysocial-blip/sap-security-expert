const router = require('express').Router();
const { requireAdmin } = require('../../middleware/auth');
const controller = require('../../controllers/admin/creditsController');

router.get('/bundles', requireAdmin, controller.listBundles);
router.post('/bundles', requireAdmin, controller.saveBundle);
router.delete('/bundles/:id', requireAdmin, controller.deleteBundle);

router.get('/coupons', requireAdmin, controller.listCoupons);
router.post('/coupons', requireAdmin, controller.saveCoupon);
router.delete('/coupons/:id', requireAdmin, controller.deleteCoupon);

router.post('/grant-credits', requireAdmin, controller.grantCredits);
router.get('/credit-transactions', requireAdmin, controller.listTransactions);
router.get('/member-credits/:id', requireAdmin, controller.getMemberCredits);
router.get('/credit-stats', requireAdmin, controller.getCreditStats);

module.exports = router;
