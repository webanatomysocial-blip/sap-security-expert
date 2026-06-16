const router = require('express').Router();
const { requireAuth } = require('../../middleware/auth');
const { checkPermission } = require('../../middleware/permissions');
const NotificationService = require('../../services/NotificationService');
const MailService = require('../../services/MailService');

// GET /api/admin/comments
router.get('/', requireAuth(), checkPermission('can_manage_comments'), async (req, res) => {
  const db = req.db;
  try {
    const [rows] = await db.execute(
      `SELECT c.*, c.user_name as author, c.content as text, c.timestamp as date, b.slug,
              p.user_name as parent_author, p.content as parent_text
       FROM comments c
       LEFT JOIN blogs b ON (c.post_id = b.id OR c.post_id = b.slug)
       LEFT JOIN comments p ON c.parent_id = p.id
       ORDER BY c.timestamp DESC`
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/admin/comments — approve/reject or edit
router.post('/', requireAuth(), checkPermission('can_manage_comments'), async (req, res) => {
  const db = req.db;
  const { id, action = 'status', status, rejection_reason, content } = req.body || {};
  if (!id) return res.status(400).json({ status: 'error', message: 'ID required' });

  try {
    if (action === 'edit') {
      if (!content) return res.status(400).json({ status: 'error', message: 'Content required for edit' });
      const [rows] = await db.execute('SELECT content, original_text FROM comments WHERE id=?', [id]);
      if (!rows.length) return res.status(404).json({ status: 'error', message: 'Comment not found' });
      const originalText = rows[0].original_text || rows[0].content;
      await db.execute(
        'UPDATE comments SET content=?, original_text=?, edited_at=CURRENT_TIMESTAMP WHERE id=?',
        [content, originalText, id]
      );
      return res.json({ status: 'success', message: 'Comment updated' });
    }

    // Status update
    if (!status) return res.status(400).json({ status: 'error', message: 'Status required' });
    await db.execute('UPDATE comments SET status=?, rejection_reason=? WHERE id=?', [status, rejection_reason || null, id]);

    const [comm] = await db.execute('SELECT user_name, email FROM comments WHERE id=?', [id]);
    if (comm.length) {
      const mailService = MailService.getInstance(db);
      const notifier = new NotificationService(mailService);
      if (status === 'approved') notifier.notifyCommentApproved(comm[0].email, comm[0].user_name).catch(() => {});
      else if (status === 'rejected') notifier.notifyCommentRejected(comm[0].email, comm[0].user_name, rejection_reason || 'Does not follow community guidelines.').catch(() => {});
    }

    return res.json({ status: 'success', message: 'Comment status updated' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// DELETE /api/admin/comments?id=X
router.delete('/', requireAuth(), checkPermission('can_manage_comments'), async (req, res) => {
  const db = req.db;
  const id = req.query.id || req.body?.id;
  if (!id) return res.status(400).json({ status: 'error', message: 'ID required' });
  try {
    await db.execute('DELETE FROM comments WHERE id=?', [id]);
    return res.json({ status: 'success', message: 'Comment deleted' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
