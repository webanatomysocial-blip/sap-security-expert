const router = require('express').Router();
const { requireAuth } = require('../../middleware/auth');
const { checkPermission } = require('../../middleware/permissions');
const NotificationService = require('../../services/NotificationService');
const MailService = require('../../services/MailService');
const { grantBonus } = require('../../services/CreditHelper');

// GET /api/admin/comments
router.get('/', requireAuth(), checkPermission('can_manage_comments'), async (req, res, next) => {
  const db = req.db;
  try {
    const [rows] = await db.execute(
      `SELECT c.id, c.post_id, c.parent_id, c.member_id, c.status,
              c.rejection_reason, c.original_text, c.edited_at, c.timestamp,
              c.user_name AS author, c.email, c.content AS text, c.timestamp AS date,
              b.slug,
              p.user_name AS parent_author, p.content AS parent_text
       FROM comments c
       LEFT JOIN blogs b ON (c.post_id = b.id OR c.post_id = b.slug)
       LEFT JOIN comments p ON c.parent_id = p.id
       ORDER BY c.timestamp DESC`
    );
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
});

// POST /api/admin/comments — approve/reject or edit
router.post('/', requireAuth(), checkPermission('can_manage_comments'), async (req, res, next) => {
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
    const ALLOWED_STATUSES = ['approved', 'rejected', 'pending'];
    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ status: 'error', message: 'Invalid status value.' });
    }
    await db.execute('UPDATE comments SET status=?, rejection_reason=? WHERE id=?', [status, rejection_reason || null, id]);

    const [comm] = await db.execute('SELECT user_name, email, member_id FROM comments WHERE id=?', [id]);
    if (comm.length) {
      const mailService = MailService.getInstance(db);
      const notifier = new NotificationService(mailService);
      if (status === 'approved') {
        notifier.notifyCommentApproved(comm[0].email, comm[0].user_name).catch(() => {});
        // Grant +2 credits to the member who posted the comment (once per comment)
        // Use member_id directly from the comment row — reliable even if email changed
        const memberId = comm[0].member_id;
        if (memberId) {
          grantBonus(db, memberId, 2, `Approved comment #${id}`).catch(() => {});

          // Grant first_comment achievement immediately on approval
          const [approvedCount] = await db.execute(
            "SELECT COUNT(*) as cnt FROM comments WHERE member_id = ? AND status = 'approved'",
            [memberId]
          );
          const cnt = approvedCount[0]?.cnt || 0;
          if (cnt >= 1) {
            db.execute(
              'INSERT IGNORE INTO member_achievements (member_id, achievement_id) VALUES (?, ?)',
              [memberId, 'first_comment']
            ).catch(() => {});
          }
          if (cnt >= 100) {
            db.execute(
              'INSERT IGNORE INTO member_achievements (member_id, achievement_id) VALUES (?, ?)',
              [memberId, '100_helpful_comments']
            ).catch(() => {});
          }
        }
      } else if (status === 'rejected') {
        notifier.notifyCommentRejected(comm[0].email, comm[0].user_name, rejection_reason || 'Does not follow community guidelines.').catch(() => {});
      }
    }

    return res.json({ status: 'success', message: 'Comment status updated' });
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/admin/comments?id=X
router.delete('/', requireAuth(), checkPermission('can_manage_comments'), async (req, res, next) => {
  const db = req.db;
  const id = req.query.id || req.body?.id;
  if (!id) return res.status(400).json({ status: 'error', message: 'ID required' });
  try {
    await db.execute('DELETE FROM comments WHERE id=?', [id]);
    return res.json({ status: 'success', message: 'Comment deleted' });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
