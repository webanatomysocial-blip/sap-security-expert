const router = require('express').Router();
const { requireAdmin, requireAuth } = require('../../middleware/auth');
const controller = require('../../controllers/admin/statsController');

// All routes mounted at /api — use full sub-paths to avoid mounting conflicts.
router.get('/admin/stats', requireAdmin, controller.adminStats);
router.get('/contributor/stats', requireAuth(), controller.contributorStats);

module.exports = router;
