const router = require('express').Router();
const { requireAdmin } = require('../../middleware/auth');
const controller = require('../../controllers/admin/ambassadorsController');

// All routes here are mounted at /api/admin, so paths are relative to that.

router.get('/ambassadors', requireAdmin, controller.list);
router.post('/ambassadors', requireAdmin, controller.performAction);
router.get('/ambassador-login', requireAdmin, controller.getAmbassadorLogin);
router.post('/create-ambassador-login', requireAdmin, controller.createAmbassadorLogin);
router.post('/update-ambassador-access', requireAdmin, controller.updateAmbassadorAccess);
router.post('/reset-ambassador-password', requireAdmin, controller.resetAmbassadorPassword);

module.exports = router;
