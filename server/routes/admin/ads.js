const router = require('express').Router();
const { requireAuth } = require('../../middleware/auth');
const { checkPermission } = require('../../middleware/permissions');
const { rateLimit } = require('../../middleware/rateLimit');
const controller = require('../../controllers/admin/adsController');

// GET /api/ads  or  GET /api/admin/ads
router.get('/', requireAuth({ allowPublic: true }), controller.get);

// POST /api/ads  or  POST /api/admin/ads
router.post('/', requireAuth(), checkPermission('can_manage_ads'), controller.save);

// POST /api/ads/click — rate limited to prevent click fraud
router.post('/click', rateLimit('ad_click', 30, 60), controller.click);

module.exports = router;
