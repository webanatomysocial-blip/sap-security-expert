const router = require('express').Router();
const { requireAdmin } = require('../../middleware/auth');
const controller = require('../../controllers/admin/blogAdsController');

router.get('/', requireAdmin, controller.list);
router.get('/for-blog', controller.listForBlog);
router.post('/', requireAdmin, controller.save);
router.patch('/:id/toggle', requireAdmin, controller.toggle);
router.post('/click/:id', controller.click);
router.delete('/:id', requireAdmin, controller.remove);

module.exports = router;
