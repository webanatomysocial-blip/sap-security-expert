const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { requireAdmin } = require('../../middleware/auth');
const NotificationService = require('../../services/NotificationService');
const MailService = require('../../services/MailService');
const { grantBonus } = require('../../services/CreditHelper');

// GET /api/admin/members?status=all|pending|approved|rejected|deleted
router.get('/', requireAdmin, async (req, res) => {
  const db = req.db;
  const status = req.query.status || 'all';
  try {
    let sql = 'SELECT id, name, email, username, phone, location, company_name, job_role, status, profile_image, created_at, is_deleted FROM members';
    const params = [];
    if (status === 'deleted') {
      // 'deleted' tab shows deactivated/soft-deleted accounts
      sql += ' WHERE (status = ? OR status = ? OR is_deleted = 1)';
      params.push('deactivated', 'deleted');
    } else if (status !== 'all') {
      // for pending/approved/rejected/suspended — exact match, exclude soft-deleted
      sql += ' WHERE status = ? AND (is_deleted = 0 OR is_deleted IS NULL)';
      params.push(status);
    }
    // 'all' returns everything — client-side filter removes deactivated from default view
    sql += ' ORDER BY created_at DESC';
    const [rows] = await db.execute(sql, params);
    return res.json({ status: 'success', members: rows });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/admin/members — approve/reject/delete/suspend
router.post('/', requireAdmin, async (req, res) => {
  const db = req.db;
  const { id, action, reason, rejection_reason } = req.body || {};
  const rejectReason = rejection_reason || reason || 'Application not approved.';
  if (!id || !action) return res.status(400).json({ status: 'error', message: 'id and action are required' });

  try {
    const [rows] = await db.execute('SELECT * FROM members WHERE id=?', [id]);
    if (!rows.length) return res.status(404).json({ status: 'error', message: 'Member not found' });
    const member = rows[0];

    const mailService = MailService.getInstance(db);
    const notifier = new NotificationService(mailService);

    if (action === 'approve') {
      await db.execute("UPDATE members SET status='approved', approved_at=CURRENT_TIMESTAMP WHERE id=?", [id]);
      notifier.notifyMemberApproved(member.email, member.name).catch(() => {});

      // Grant 10 registration welcome credits (once only)
      grantBonus(db, id, 10, 'Registration welcome bonus').catch(e => console.error('[approve_credits]', e.message));

      return res.json({ status: 'success', message: 'Member approved.' });

    } else if (action === 'reject') {
      await db.execute("UPDATE members SET status='rejected', rejection_reason=? WHERE id=?", [rejectReason, id]);
      notifier.notifyMemberRejected(member.email, member.name, rejectReason).catch(() => {});
      return res.json({ status: 'success', message: 'Member rejected.' });

    } else if (action === 'suspend') {
      await db.execute("UPDATE members SET status='suspended' WHERE id=?", [id]);
      return res.json({ status: 'success', message: 'Member suspended.' });

    } else if (action === 'reactivate') {
      await db.execute("UPDATE members SET status='approved', is_deleted=0, deleted_at=NULL WHERE id=?", [id]);
      await db.execute("UPDATE users SET is_active=1, is_deleted=0, deleted_at=NULL WHERE LOWER(email)=LOWER(?)", [member.email]).catch(() => {});
      await db.execute("UPDATE contributors SET status='approved', is_deleted=0, deleted_at=NULL WHERE LOWER(email)=LOWER(?)", [member.email]).catch(() => {});
      notifier.notifyMemberApproved(member.email, member.name).catch(() => {});
      return res.json({ status: 'success', message: 'Member account reactivated.' });

    } else if (action === 'delete') {
      // Already soft-deleted (deactivated) — allow hard-delete the record permanently
      if (member.is_deleted == 1 || member.status === 'deleted' || member.status === 'deactivated') {
        await db.execute('DELETE FROM members WHERE id=?', [id]);
        return res.json({ status: 'success', message: 'Deleted user record permanently removed.' });
      }

      // Active member — deactivate directly (no OTP required)
      await db.execute("UPDATE members SET is_deleted=1, deleted_at=CURRENT_TIMESTAMP, status='deactivated' WHERE id=?", [id]);
      await db.execute("UPDATE users SET is_active=0, is_deleted=1, deleted_at=CURRENT_TIMESTAMP WHERE LOWER(email)=LOWER(?)", [member.email]).catch(() => {});
      await db.execute("UPDATE contributors SET is_deleted=1, deleted_at=CURRENT_TIMESTAMP, status='deactivated' WHERE LOWER(email)=LOWER(?)", [member.email]).catch(() => {});

      notifier.notifyAccountDeleted(member.email, member.name).catch(() => {});
      return res.json({ status: 'success', message: 'Member account deactivated.' });
    }

    return res.status(400).json({ status: 'error', message: 'Unknown action' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/admin/reset-member-password
router.post('/reset-password', requireAdmin, async (req, res) => {
  const db = req.db;
  const { member_id } = req.body || {};
  if (!member_id) return res.status(400).json({ status: 'error', message: 'member_id required' });
  try {
    const newPassword = Math.random().toString(36).slice(-10);
    const hash = await bcrypt.hash(newPassword, 10);
    await db.execute('UPDATE members SET password_hash=? WHERE id=?', [hash, member_id]);

    // Sync to users table (contributor login) if the same email has a contributor account
    const [memberRows] = await db.execute('SELECT email FROM members WHERE id=?', [member_id]);
    if (memberRows.length) {
      await db.execute(
        'UPDATE users SET password=? WHERE LOWER(email)=LOWER(?)',
        [hash, memberRows[0].email]
      ).catch(() => {});
    }

    return res.json({ status: 'success', message: 'Password reset.', new_password: newPassword });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
