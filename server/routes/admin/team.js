const router = require('express').Router();
const { requireAdmin } = require('../../middleware/auth');
const controller = require('../../controllers/admin/teamController');

// Creating/managing admin accounts is a full-admin-only capability —
// not delegable via the permissions system (admins bypass all permission
// checks entirely, so there's nothing meaningful to gate with a permission flag).
router.get('/', requireAdmin, controller.list);
router.post('/', requireAdmin, controller.create);
router.post('/:id/toggle-active', requireAdmin, controller.toggleActive);
router.post('/:id/reset-password', requireAdmin, controller.resetPassword);

module.exports = router;
