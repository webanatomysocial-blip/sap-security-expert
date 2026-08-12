const router = require('express').Router();
const { rateLimit } = require('../middleware/rateLimit');
const { requireCsrf } = require('../middleware/auth');
const controller = require('../controllers/commentsPublicController');

// GET /api/get-comments?blogId=...
router.get('/get-comments', rateLimit('comments_read', 60, 60), controller.getComments);

// POST /api/comments
router.post('/comments', rateLimit('comment', 5, 60), requireCsrf, controller.saveComment);

module.exports = router;
