const router = require('express').Router();
const { rateLimit } = require('../middleware/rateLimit');
const NotificationService = require('../services/NotificationService');
const MailService = require('../services/MailService');

// GET /api/get_comments.php?blogId=...
router.get(['/get_comments.php', '/get-comments'], async (req, res) => {
  const db = req.db;
  const { blogId } = req.query;
  if (!blogId) return res.status(400).json({ status: 'error', message: 'blogId is required' });

  try {
    const [rows] = await db.execute(
      `SELECT c.*,
              c.user_name  AS author,
              c.content    AS text,
              c.timestamp  AS date,
              p.user_name  AS parent_author,
              p.content    AS parent_text
       FROM comments c
       LEFT JOIN comments p ON c.parent_id = p.id
       WHERE c.post_id = ? AND c.status = 'approved'
       ORDER BY c.timestamp ASC`,
      [blogId]
    );
    // Decode HTML entities left over from old PHP htmlspecialchars() saves
    const decode = (s) => typeof s === 'string'
      ? s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
           .replace(/&quot;/g, '"').replace(/&#039;/g, "'")
      : s;
    const decoded = rows.map(r => ({
      ...r,
      text:        decode(r.text),
      author:      decode(r.author),
      parent_text: decode(r.parent_text),
    }));
    return res.json(decoded);
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/save_comment.php  or  POST /api/comments
router.post(['/save_comment.php', '/comments'], rateLimit('comment', 5, 60), async (req, res) => {
  const db = req.db;
  const body = req.body || {};
  const post_id   = body.post_id   || body.blogId;
  const user_name = body.user_name || body.author;
  const { email } = body;
  const content   = body.content   || body.text;
  const parent_id = body.parent_id ?? null;

  if (!post_id || !user_name || !email || !content) {
    return res.status(400).json({ status: 'error', message: 'All fields are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ status: 'error', message: 'Invalid email address.' });
  }

  try {
    // Resolve blog title for notifications
    const [blogRows] = await db.execute(
      'SELECT title FROM blogs WHERE slug = ? OR id = ? LIMIT 1', [post_id, post_id]
    );
    const articleTitle = blogRows[0]?.title || post_id;

    await db.execute(
      `INSERT INTO comments (post_id, user_name, email, content, parent_id, status, timestamp)
       VALUES (?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
      [post_id, user_name, email, content, parent_id || null]
    );

    const mailService = MailService.getInstance(db);
    const notifier = new NotificationService(mailService);
    notifier.notifyCommentSubmitted(email, user_name).catch(() => {});
    notifier.notifyAdminNewComment({ article_title: articleTitle, content, user_name, user_email: email }).catch(() => {});

    return res.json({ status: 'success', message: 'Comment submitted for review.' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
