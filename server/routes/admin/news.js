const router = require('express').Router();
const { requireAdmin } = require('../../middleware/auth');
const controller = require('../../controllers/admin/newsController');

router.get('/', requireAdmin, controller.list);
router.post('/', requireAdmin, controller.save);
router.delete('/:id', requireAdmin, controller.remove);

module.exports = router;
