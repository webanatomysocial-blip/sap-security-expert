const router = require('express').Router();
const { requireAuth } = require('../../middleware/auth');
const { checkPermission } = require('../../middleware/permissions');
const controller = require('../../controllers/admin/announcementsController');

// GET /api/announcements  or  GET /api/admin/announcements
router.get('/', requireAuth({ allowPublic: true }), controller.list);

// GET /api/admin/announcements/:slug
router.get('/:slug', requireAuth({ allowPublic: true }), controller.getBySlug);

// POST /api/admin/announcements
router.post('/', requireAuth(), checkPermission('can_manage_announcements'), controller.save);

// DELETE /api/admin/announcements
router.delete('/', requireAuth(), checkPermission('can_manage_announcements'), controller.remove);

// POST /api/admin/announcements/:id/review
router.post('/:id/review', requireAuth(), checkPermission('can_manage_announcements'), controller.review);

module.exports = router;
