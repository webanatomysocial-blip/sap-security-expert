const router = require('express').Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const controller = require('../controllers/postsController');

router.get('/exclusive-count', controller.exclusiveCount);
router.get('/by-ids', controller.byIds);
router.get('/:slug/suggested', controller.suggested);
router.put('/:id/badges', requireAdmin, controller.updateBadges);
router.get('/:idOrSlug?', requireAuth({ allowPublic: true }), controller.list);
router.post('/', requireAuth(), checkPermission('can_manage_blogs'), controller.save);
router.delete('/:id', requireAuth(), checkPermission('can_manage_blogs'), controller.remove);

module.exports = router;
