const router = require('express').Router();
const { rateLimit } = require('../middleware/rateLimit');
const controller = require('../controllers/commentsPublicController');

// GET /api/get_comments.php?blogId=...
router.get(['/get_comments.php', '/get-comments'], rateLimit('comments_read', 60, 60), controller.getComments);

// POST /api/save_comment.php  or  POST /api/comments
router.post(['/save_comment.php', '/comments'], rateLimit('comment', 5, 60), controller.saveComment);

module.exports = router;
