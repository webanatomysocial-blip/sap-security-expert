const router = require('express').Router();
const { requireAdmin } = require('../../middleware/auth');
const controller = require('../../controllers/admin/contributorsController');

// All routes here are mounted at /api/admin, so paths are relative to that.

router.get('/contributors', requireAdmin, controller.list);
router.post('/contributors', requireAdmin, controller.performAction);
router.get('/contributor-login', requireAdmin, controller.getContributorLogin);
router.post('/create-contributor-login', requireAdmin, controller.createContributorLogin);
router.post('/update-contributor-access', requireAdmin, controller.updateContributorAccess);
router.post('/reset-contributor-password', requireAdmin, controller.resetContributorPassword);
router.post('/delete-contributor', requireAdmin, controller.deleteContributorLegacy);

module.exports = router;
