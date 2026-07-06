const router = require('express').Router();
const { requireAdmin } = require('../../middleware/auth');
const controller = require('../../controllers/admin/membersController');

router.get('/', requireAdmin, controller.list);
router.post('/', requireAdmin, controller.performAction);
router.post('/reset-password', requireAdmin, controller.resetPassword);

module.exports = router;
