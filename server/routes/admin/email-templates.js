const router = require('express').Router();
const { requireAdmin } = require('../../middleware/auth');
const controller = require('../../controllers/admin/emailTemplatesController');

router.get('/', requireAdmin, controller.list);
router.get('/:key(*)', requireAdmin, controller.get);
router.put('/:key(*)', requireAdmin, controller.save);

module.exports = router;
