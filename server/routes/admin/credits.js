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
router.post('/bulk-grant-credits', requireAdmin, controller.bulkGrantCredits);
router.get('/credit-transactions', requireAdmin, controller.listTransactions);
router.get('/member-credits/:id', requireAdmin, controller.getMemberCredits);
router.get('/credit-stats', requireAdmin, controller.getCreditStats);

router.get('/credit-activities', requireAdmin, controller.listActivities);
router.post('/credit-activities', requireAdmin, controller.saveActivity);
router.delete('/credit-activities/:id', requireAdmin, controller.deleteActivity);

router.get('/achievement-types', requireAdmin, controller.listAchievements);
router.post('/achievement-types', requireAdmin, controller.saveAchievement);
router.delete('/achievement-types/:id', requireAdmin, controller.deleteAchievement);

module.exports = router;
