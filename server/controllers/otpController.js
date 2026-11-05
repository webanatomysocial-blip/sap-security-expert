const { buildResetLink } = require('../utils/resetLink');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const OTPService = require('../services/OTPService');
const MailService = require('../services/MailService');
const NotificationService = require('../services/NotificationService');
const repo = require('../repositories/otpRepository');
const { revokeAccountSessions } = require('../services/sessionRevocation');

const hashResetToken = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');

// All five handlers below keep their original explicit try/catch (not
// asyncHandler/next(err)): each one either forwards a deliberately safe,
// specific error message from a service class (OTPService/MailService) as a
// 4xx, or returns its own specific-but-safe message on failure. Centralizing
// these through the generic error middleware would replace that exact text
// with "Internal server error" / lose the specific 4xx status, changing the
// response — preserved exactly, same tradeoff made in authController.js.

// POST /api/send-otp
const sendOtp = async (req, res) => {
  const db = req.db;
  const { email, type = 'signup' } = req.body || {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ status: 'error', message: 'Valid email is required.' });
  }

  try {
    if (type === 'signup') {
      const member = await repo.findMemberStatusByEmail(db, email);
      if (member) {
        const { status: s, is_deleted: isDeleted } = member;
        if (s === 'deactivated' || isDeleted === 1 || s === 'deleted') {
          return res.status(403).json({
            status: 'deactivated',
            message: 'This account has been deactivated. Please contact the administrator at hello@sapsecurityexpert.com to reactivate it.',
          });
        }
        if (s === 'approved') return res.status(409).json({ status: 'error', message: 'This email is already registered. Please log in.' });
        if (s === 'pending') return res.status(409).json({ status: 'error', message: 'Your signup request is already pending admin approval.' });
        return res.status(403).json({ status: 'error', message: 'This account has been rejected or disabled. Contact support.' });
      }
    }

    if (type === 'reset' || type === 'delete_account') {
      const member = await repo.findActiveMemberByEmail(db, email);
      if (!member) {
        const user = await repo.findActiveUserByEmail(db, email);
        if (!user) {
          // Return success silently — don't reveal whether the email exists
          return res.json({ status: 'success', message: 'If an account exists with this email, a verification code has been sent.' });
        }
      }
    }

    const ip = req.ip || '0.0.0.0';
    const otpService = new OTPService(db);
    const code = await otpService.generateOTP(email, type, ip);

    const mailService = MailService.getInstance();
    const subjectMap = { reset: 'Password Reset Verification Code', delete_account: 'Account Deletion Verification Code' };
    const templateMap = { reset: 'member/reset_otp', delete_account: 'member/account_deletion_otp' };
    const subject = subjectMap[type] || 'Verification Code';
    const template = templateMap[type] || 'member/otp_verification';

    const memberNameRow = await repo.findMemberNameByEmail(db, email);
    const userNameRow = memberNameRow ? null : await repo.findUserNameByEmail(db, email);
    const name = (memberNameRow || userNameRow)?.name || 'Member';

    const ok = await mailService.send(db, email, subject, template, { name, code, year: new Date().getFullYear() });
    if (!ok) {
      // SMTP failed — queue for retry so the user can still receive the code
      await mailService.queueTransactional(db, email, subject,
        `<p>Your verification code is: <strong>${code}</strong></p><p>This code expires in 10 minutes.</p>`
      );
    }

    return res.json({ status: 'success', message: 'If an account exists with this email, a verification code has been sent.' });
  } catch (err) {
    return res.status(400).json({ status: 'error', message: err.message });
  }
};

// POST /api/verify-otp
const verifyOtp = async (req, res) => {
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
};

// POST /api/forgot-password
const forgotPassword = async (req, res) => {
  const db = req.db;
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ status: 'error', message: 'Email is required.' });

  try {
    const member = await repo.findMemberIdAndNameByEmail(db, email);
    if (!member) {
      const user = await repo.findActiveUserIdAndNameByEmail(db, email);
      if (!user) {
        // Return success silently — don't reveal whether the email exists
        return res.json({ status: 'success', message: 'If an account exists with this email, reset instructions have been sent.' });
      }
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    // Only a hash is stored; the emailed link carries the raw token.
    await repo.upsertResetToken(db, email, hashResetToken(token), expiry);

    const siteUrl = (process.env.SITE_URL || 'http://sapsecurityexpert.com').replace(/\/$/, '');
    const resetUrl = buildResetLink(siteUrl, token, email);

    // Not awaited: sending time must not reveal whether the account exists.
    const mailService = MailService.getInstance();
    const notifier = new NotificationService(mailService, db);
    notifier.notifyPasswordReset(email, resetUrl).catch((e) => console.error('[forgot-password] mail', e.message));

    return res.json({ status: 'success', message: 'If an account exists with this email, reset instructions have been sent.' });
  } catch (err) {
    console.error('[forgot-password]', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to process request.' });
  }
};

// POST /api/reset-with-token
const resetWithToken = async (req, res) => {
  const db = req.db;
  const { email, token, password } = req.body || {};
  if (!email || !token || !password) {
    return res.status(400).json({ status: 'error', message: 'Email, token and password are required.' });
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return res.status(400).json({ status: 'error', message: 'Password must be 8–128 characters.' });
  }

  try {
    // Claim the token first, atomically: only one request can use it, even if two arrive at once.
    const claimed = await repo.claimResetToken(db, email, hashResetToken(token));
    if (!claimed) return res.status(400).json({ status: 'error', message: 'Invalid or expired reset token.' });

    const hash = await bcrypt.hash(password, 10);
    await repo.updateMemberPassword(db, email, hash);
    await repo.updateUserPassword(db, email, hash).catch(() => {});
    await revokeAccountSessions(db, email);
    await repo.deleteResetTokensByEmail(db, email);

    return res.json({ status: 'success', message: 'Password reset successfully.' });
  } catch (err) {
    console.error('[reset-with-token]', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to reset password.' });
  }
};

// POST /api/reset-password-otp
const resetPasswordOtp = async (req, res) => {
  const db = req.db;
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ status: 'error', message: 'Email and password are required.' });
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return res.status(400).json({ status: 'error', message: 'Password must be 8–128 characters.' });
  }

  try {
    // Atomically claim the verified OTP row: UPDATE status to 'used' only if
    // it's currently 'verified' and was created within the last 30 minutes.
    // This prevents a race where two concurrent requests both pass isVerified()
    // before either one marks the row as used.
    const [claimResult] = await db.execute(
      `UPDATE verification_codes SET status = 'used'
       WHERE email = ? AND type = 'reset' AND status = 'verified'
         AND created_at >= DATE_SUB(NOW(), INTERVAL 30 MINUTE)`,
      [email]
    );
    if (!claimResult.affectedRows) {
      throw new Error('Verification code not found or already used.');
    }

    const hash = await bcrypt.hash(password, 10);
    await repo.updateMemberPassword(db, email, hash);
    await repo.updateUserPassword(db, email, hash).catch(() => {});
    await revokeAccountSessions(db, email);

    return res.json({ status: 'success', message: 'Password reset successfully.' });
  } catch (err) {
    console.error('[reset-password-otp]', err.message);
    return res.status(400).json({ status: 'error', message: err.message });
  }
};

module.exports = { sendOtp, verifyOtp, forgotPassword, resetWithToken, resetPasswordOtp };
