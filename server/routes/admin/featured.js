const router = require('express').Router();
const { requireAdmin } = require('../../middleware/auth');
const controller = require('../../controllers/admin/featuredController');

// All routes mounted at /api/admin/featured-insights
router.get('/', requireAdmin, controller.list);
router.post('/', requireAdmin, controller.save);

module.exports = router;
