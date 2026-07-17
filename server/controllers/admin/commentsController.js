const { asyncHandler } = require('../../utils/asyncHandler');
const { sendSuccess, sendError } = require('../../utils/apiResponse');
const NotificationService = require('../../services/NotificationService');
const MailService = require('../../services/MailService');
const { grantBonus, getActivityCredits } = require('../../services/CreditHelper');
const repo = require('../../repositories/admin/commentsRepository');

const ALLOWED_STATUSES = ['approved', 'rejected', 'pending'];

// GET /api/admin/comments
// Returns a bare array — not the {status, ...} envelope used elsewhere in
// this codebase. Preserved exactly as the existing response shape.
const list = asyncHandler(async (req, res) => {
  const rows = await repo.findAllWithContext(req.db);
  return res.json(rows);
});

// POST /api/admin/comments — approve/reject or edit
const save = asyncHandler(async (req, res) => {
  const db = req.db;
  const { id, action = 'status', status, rejection_reason, content } = req.body || {};
  if (!id) return sendError(res, 'ID required', 400);

  if (action === 'edit') {
    if (!content) return sendError(res, 'Content required for edit', 400);
    const existing = await repo.findContentById(db, id);
    if (!existing) return sendError(res, 'Comment not found', 404);
    const originalText = existing.original_text || existing.content;
    await repo.updateContent(db, id, content, originalText);
    return sendSuccess(res, { message: 'Comment updated' });
  }

  // Status update
  if (!status || !ALLOWED_STATUSES.includes(status)) {
    return sendError(res, 'Invalid status value.', 400);
  }
  await repo.updateStatus(db, id, status, rejection_reason);

  const comm = await repo.findAuthorInfoById(db, id);
  if (comm) {
    const mailService = MailService.getInstance(db);
    const notifier = new NotificationService(mailService);
    if (status === 'approved') {
      notifier.notifyCommentApproved(comm.email, comm.user_name).catch(() => {});
      // Grant +2 credits to the member who posted the comment (once per comment)
      // Use member_id directly from the comment row — reliable even if email changed
      const memberId = comm.member_id;
      if (memberId) {
        getActivityCredits(db, 'approved_comment', 2).then((amt) =>
          grantBonus(db, memberId, amt, `Approved comment #${id}`)
        ).catch(() => {});

        // Grant first_comment achievement immediately on approval
        const cnt = await repo.countApprovedByMember(db, memberId);
        if (cnt >= 1) repo.grantAchievement(db, memberId, 'first_comment').catch(() => {});
        if (cnt >= 100) repo.grantAchievement(db, memberId, '100_helpful_comments').catch(() => {});
      }
    } else if (status === 'rejected') {
      notifier.notifyCommentRejected(comm.email, comm.user_name, rejection_reason || 'Does not follow community guidelines.').catch(() => {});
    }
  }

  return sendSuccess(res, { message: 'Comment status updated' });
});

// DELETE /api/admin/comments?id=X
const remove = asyncHandler(async (req, res) => {
  const id = req.query.id || req.body?.id;
  if (!id) return sendError(res, 'ID required', 400);
  await repo.remove(req.db, id);
  return sendSuccess(res, { message: 'Comment deleted' });
});

module.exports = { list, save, remove };
