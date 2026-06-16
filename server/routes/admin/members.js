const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { requireAdmin } = require('../../middleware/auth');
const NotificationService = require('../../services/NotificationService');
const MailService = require('../../services/MailService');
const OTPService = require('../../services/OTPService');

// GET /api/admin/members?status=all|pending|approved|rejected
router.get('/', requireAdmin, async (req, res) => {
  const db = req.db;
  const status = req.query.status || 'all';
  try {
    let sql = 'SELECT id, name, email, username, phone, location, company_name, job_role, status, profile_image, created_at, is_deleted FROM members';
    const params = [];
    if (status !== 'all') {
      sql += ' WHERE status = ?'; params.push(status);
    }
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
  const { id, action, reason, otp } = req.body || {};
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
      return res.json({ status: 'success', message: 'Member approved.' });

    } else if (action === 'reject') {
      await db.execute("UPDATE members SET status='rejected' WHERE id=?", [id]);
      notifier.notifyMemberRejected(member.email, member.name, reason || 'Application not approved.').catch(() => {});
      return res.json({ status: 'success', message: 'Member rejected.' });

    } else if (action === 'suspend') {
      await db.execute("UPDATE members SET status='suspended' WHERE id=?", [id]);
      return res.json({ status: 'success', message: 'Member suspended.' });

    } else if (action === 'delete') {
      // Already soft-deleted (anonymised) — just hard-delete the record immediately, no OTP needed
      if (member.is_deleted == 1 || member.status === 'deleted') {
        await db.execute('DELETE FROM members WHERE id=?', [id]);
        return res.json({ status: 'success', message: 'Deleted user record permanently removed.' });
      }

      // Active member — Step 1: send OTP to their email for confirmation
      const otpService = new OTPService(db);
      const code = await otpService.generateOTP(member.email, 'account_deletion', req.ip);
      notifier.notifyAccountDeletionOTP(member.email, member.name, code).catch(() => {});
      return res.json({ status: 'otp_sent', message: `A deletion verification code has been sent to ${member.email}. Enter it below to confirm.` });

    } else if (action === 'delete_confirm') {
      // Step 2: verify OTP then hard-delete
      if (!otp) return res.status(400).json({ status: 'error', message: 'OTP is required to confirm deletion.' });
      const otpService = new OTPService(db);
      await otpService.verifyOTP(member.email, otp, 'account_deletion');

      await db.execute('DELETE FROM members WHERE id=?', [id]);
      notifier.notifyAccountDeleted(member.email, member.name).catch(() => {});
      return res.json({ status: 'success', message: 'Member account permanently deleted.' });
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
