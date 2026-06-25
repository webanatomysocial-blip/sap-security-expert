const router = require('express').Router();
const OTPService = require('../services/OTPService');
const MailService = require('../services/MailService');
const { rateLimit } = require('../middleware/rateLimit');

// POST /api/send_otp.php
router.post(['/send_otp.php', '/send-otp'], rateLimit('otp_send', 5, 300), async (req, res) => {
  const db = req.db;
  const { email, type = 'signup' } = req.body || {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ status: 'error', message: 'Valid email is required.' });
  }

  try {
    if (type === 'signup') {
      const [rows] = await db.execute('SELECT id, status, is_deleted FROM members WHERE LOWER(email) = LOWER(?) LIMIT 1', [email]);
      if (rows.length) {
        const s = rows[0].status;
        const isDeleted = rows[0].is_deleted;
        if (s === 'deactivated' || isDeleted === 1 || s === 'deleted') {
          return res.status(403).json({
            status: 'deactivated',
            message: 'This account has been deactivated. Please contact the administrator at hello@sapsecurityexpert.com to reactivate it.'
          });
        }
        if (s === 'approved') return res.status(409).json({ status: 'error', message: 'This email is already registered. Please log in.' });
        if (s === 'pending') return res.status(409).json({ status: 'error', message: 'Your signup request is already pending admin approval.' });
        return res.status(403).json({ status: 'error', message: 'This account has been rejected or disabled. Contact support.' });
      }
    }

    if (type === 'reset' || type === 'delete_account') {
      const [mRows] = await db.execute('SELECT id FROM members WHERE LOWER(email) = LOWER(?) AND is_deleted = 0 LIMIT 1', [email]);
      if (!mRows.length) {
        const [uRows] = await db.execute('SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND is_active = 1 LIMIT 1', [email]);
        if (!uRows.length) {
          // Return success silently — don't reveal whether the email exists
          return res.json({ status: 'success', message: 'If an account exists with this email, a verification code has been sent.' });
        }
      }
    }

    const ip = req.ip || '0.0.0.0';
    const otpService = new OTPService(db);
    const code = await otpService.generateOTP(email, type, ip);

    const mailService = MailService.getInstance(db);
    const subjectMap = { reset: 'Password Reset Verification Code', delete_account: 'Account Deletion Verification Code' };
    const templateMap = { delete_account: 'member/account_deletion_otp' };
    const subject = subjectMap[type] || 'Verification Code';
    const template = templateMap[type] || 'member/otp_verification';

    const [nameRows] = await db.execute('SELECT name FROM members WHERE LOWER(email) = LOWER(?) LIMIT 1', [email]);
    const [userNameRows] = nameRows.length ? [nameRows] : await db.execute('SELECT full_name AS name FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1', [email]);
    const name = (nameRows[0] || userNameRows[0])?.name || 'Member';

    const ok = await mailService.send(email, subject, template, { name, code, year: new Date().getFullYear() });
    if (!ok) throw new Error('Failed to send verification email. Please contact support.');

    return res.json({ status: 'success', message: 'If an account exists with this email, a verification code has been sent.' });
  } catch (err) {
    return res.status(400).json({ status: 'error', message: err.message });
  }
});

// POST /api/verify_otp.php
router.post(['/verify_otp.php', '/verify-otp'], async (req, res) => {
  const db = req.db;
  const { email, code, type = 'signup' } = req.body || {};

  if (!email || !code) {
    return res.status(400).json({ status: 'error', message: 'Email and code are required.' });
  }

  try {
    const otpService = new OTPService(db);
    await otpService.verifyOTP(email, code, type);
    return res.json({ status: 'success', message: 'Email verified successfully.' });
  } catch (err) {
    return res.status(400).json({ status: 'error', message: err.message });
  }
});

// POST /api/forgot_password.php
router.post(['/forgot_password.php', '/forgot-password'], rateLimit('forgot_password', 5, 300), async (req, res) => {
  const db = req.db;
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ status: 'error', message: 'Email is required.' });

  try {
    const [rows] = await db.execute('SELECT id, name FROM members WHERE LOWER(email) = LOWER(?) AND is_deleted = 0 LIMIT 1', [email]);
    if (!rows.length) {
      const [uRows] = await db.execute('SELECT id, full_name AS name FROM users WHERE LOWER(email) = LOWER(?) AND is_active = 1 LIMIT 1', [email]);
      if (!uRows.length) {
        // Return success silently — don't reveal whether the email exists
        return res.json({ status: 'success', message: 'If an account exists with this email, reset instructions have been sent.' });
      }
    }

    const token = require('crypto').randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    await db.execute(
      'INSERT INTO password_reset_tokens (email, token, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE token=VALUES(token), expires_at=VALUES(expires_at)',
      [email, token, expiry]
    );

    const siteUrl = (process.env.SITE_URL || 'http://dev.sapsecurityexpert.com').replace(/\/$/, '');
    const resetUrl = `${siteUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    const mailService = MailService.getInstance(db);
    const NotificationService = require('../services/NotificationService');
    const notifier = new NotificationService(mailService);
    await notifier.notifyPasswordReset(email, resetUrl);

    return res.json({ status: 'success', message: 'If an account exists with this email, reset instructions have been sent.' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/reset_with_token.php
router.post(['/reset_with_token.php', '/reset-with-token'], async (req, res) => {
  const db = req.db;
  const { email, token, password } = req.body || {};
  if (!email || !token || !password) {
    return res.status(400).json({ status: 'error', message: 'Email, token and password are required.' });
  }

  try {
    const [rows] = await db.execute(
      'SELECT id FROM password_reset_tokens WHERE email = ? AND token = ? AND expires_at >= NOW()',
      [email, token]
    );
    if (!rows.length) return res.status(400).json({ status: 'error', message: 'Invalid or expired reset token.' });

    const hash = await require('bcryptjs').hash(password, 10);
    await db.execute('UPDATE members SET password_hash = ? WHERE LOWER(email) = LOWER(?)', [hash, email]);
    await db.execute('UPDATE users SET password = ? WHERE LOWER(email) = LOWER(?)', [hash, email]).catch(() => {});
    await db.execute('DELETE FROM password_reset_tokens WHERE LOWER(email) = LOWER(?)', [email]);

    return res.json({ status: 'success', message: 'Password reset successfully.' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/reset_password_otp.php
router.post(['/reset_password_otp.php', '/reset-password-otp'], async (req, res) => {
  const db = req.db;
  const { email, code, password } = req.body || {};
  if (!email || !code || !password) {
    return res.status(400).json({ status: 'error', message: 'Email, code and password are required.' });
  }

  try {
    const otpService = new OTPService(db);
    await otpService.verifyOTP(email, code, 'reset');

    const hash = await require('bcryptjs').hash(password, 10);
    await db.execute('UPDATE members SET password_hash = ? WHERE LOWER(email) = LOWER(?)', [hash, email]);
    // Also update users table in case this is a contributor account
    await db.execute('UPDATE users SET password = ? WHERE LOWER(email) = LOWER(?)', [hash, email]).catch(() => {});

    return res.json({ status: 'success', message: 'Password reset successfully.' });
  } catch (err) {
    return res.status(400).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
