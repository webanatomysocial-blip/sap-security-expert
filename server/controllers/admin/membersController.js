const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { asyncHandler } = require('../../utils/asyncHandler');
const { sendSuccess, sendError } = require('../../utils/apiResponse');
const NotificationService = require('../../services/NotificationService');
const MailService = require('../../services/MailService');
const { grantBonus } = require('../../services/CreditHelper');
const repo = require('../../repositories/admin/membersRepository');

// GET /api/admin/members?status=all|pending|approved|rejected|deleted
const list = asyncHandler(async (req, res) => {
  const status = req.query.status || 'all';
  const members = await repo.findByStatus(req.db, status);
  return sendSuccess(res, { members });
});

// POST /api/admin/members — approve/reject/delete/suspend
const performAction = asyncHandler(async (req, res) => {
  const db = req.db;
  const { id, action, reason, rejection_reason } = req.body || {};
  const rejectReason = rejection_reason || reason || 'Application not approved.';
  if (!id || !action) return sendError(res, 'id and action are required', 400);

  const member = await repo.findById(db, id);
  if (!member) return sendError(res, 'Member not found', 404);

  const mailService = MailService.getInstance(db);
  const notifier = new NotificationService(mailService);

  if (action === 'approve') {
    await repo.approve(db, id);
    notifier.notifyMemberApproved(member.email, member.name).catch(() => {});

    // Grant 10 registration welcome credits (once only)
    grantBonus(db, id, 10, 'Registration welcome bonus').catch((e) => console.error('[approve_credits]', e.message));

    // Credit the referrer +2 if this member was referred
    if (member.referred_by_code) {
      const referrer = await repo.findApprovedByReferralCode(db, member.referred_by_code);
      if (referrer) {
        grantBonus(db, referrer.id, 2, `Referral bonus: member #${id} joined`).catch((e) => console.error('[referral_credits]', e.message));
      }
    }

    return sendSuccess(res, { message: 'Member approved.' });
  } else if (action === 'reject') {
    await repo.reject(db, id, rejectReason);
    notifier.notifyMemberRejected(member.email, member.name, rejectReason).catch(() => {});
    return sendSuccess(res, { message: 'Member rejected.' });
  } else if (action === 'suspend') {
    await repo.suspend(db, id);
    return sendSuccess(res, { message: 'Member suspended.' });
  } else if (action === 'reactivate') {
    await repo.reactivate(db, id, member.email);
    notifier.notifyMemberApproved(member.email, member.name).catch(() => {});
    return sendSuccess(res, { message: 'Member account reactivated.' });
  } else if (action === 'delete') {
    // Already soft-deleted (deactivated) — allow hard-delete the record permanently
    if (member.is_deleted == 1 || member.status === 'deleted' || member.status === 'deactivated') {
      await repo.hardDelete(db, id);
      return sendSuccess(res, { message: 'Deleted user record permanently removed.' });
    }

    // Active member — deactivate directly (no OTP required)
    await repo.softDelete(db, id, member.email);
    notifier.notifyAccountDeleted(member.email, member.name).catch(() => {});
    return sendSuccess(res, { message: 'Member account deactivated.' });
  }

  return sendError(res, 'Unknown action', 400);
});

// POST /api/admin/reset-member-password
const resetPassword = asyncHandler(async (req, res) => {
  const db = req.db;
  const { member_id } = req.body || {};
  if (!member_id) return sendError(res, 'member_id required', 400);

  // Use cryptographically secure random password
  const newPassword = crypto.randomBytes(10).toString('base64url').slice(0, 12);
  const hash = await bcrypt.hash(newPassword, 10);
  await repo.updatePasswordHash(db, member_id, hash);

  // Sync to users table (contributor login) if the same email has a contributor account
  const email = await repo.findEmailById(db, member_id);
  if (email) {
    await repo.syncPasswordToUser(db, email, hash).catch(() => {});
  }

  return sendSuccess(res, { message: 'Password reset.', new_password: newPassword });
});

module.exports = { list, performAction, resetPassword };
