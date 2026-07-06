const router = require('express').Router();
const { requireAuth } = require('../../middleware/auth');
const { checkPermission } = require('../../middleware/permissions');
const controller = require('../../controllers/admin/commentsController');

router.get('/', requireAuth(), checkPermission('can_manage_comments'), controller.list);
router.post('/', requireAuth(), checkPermission('can_manage_comments'), controller.save);
router.delete('/', requireAuth(), checkPermission('can_manage_comments'), controller.remove);

module.exports = router;
