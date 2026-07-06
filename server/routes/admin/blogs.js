const router = require('express').Router();
const { requireAdmin, requireAuth } = require('../../middleware/auth');
const { checkPermission } = require('../../middleware/permissions');
const controller = require('../../controllers/admin/blogsController');

router.get('/pending', requireAuth(), checkPermission('can_review_blogs'), controller.listPending);
router.put('/:id/review', requireAuth(), checkPermission('can_review_blogs'), controller.review);
router.post('/recalculate-plagiarism', requireAuth(), checkPermission('can_review_blogs'), controller.recalculatePlagiarism);
router.post('/bulk-recalculate-plagiarism', requireAdmin, controller.bulkRecalculatePlagiarism);
router.post('/toggle-exclusive', requireAdmin, controller.toggleExclusive);
router.post('/toggle-premium', requireAdmin, controller.togglePremium);
router.post('/toggle-expert-pick', requireAdmin, controller.toggleExpertPick);
router.get('/select-list', requireAdmin, controller.selectList);

module.exports = router;
