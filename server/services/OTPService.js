/**
 * OTP generation and verification.
 *
 * Codes are stored only as HMAC-SHA-256 digests keyed with OTP_HASH_SECRET. A plain hash of a
 * six-digit code can be reversed in moments by anyone who obtains the table; the key prevents
 * that. The key must be a hex string of at least 32 bytes and must be identical on every
 * application instance. There is no fallback: a missing or weak key stops the service.
 * Neither the code, its digest, nor the key is ever logged.
 *
 * All datetime logic is DB-native.
 */
const crypto = require('crypto');

const MIN_SECRET_BYTES = 32;
const HEX_RE = /^[0-9a-fA-F]+$/;

class OTPConfigError extends Error {
  constructor(message) { super(message); this.name = 'OTPConfigError'; this.status = 500; }
}

// Reads and validates the key at call time, so a changed environment takes effect without a
// module reload. Throws OTPConfigError with an explanation that never contains the key.
function otpKey() {
  const raw = (process.env.OTP_HASH_SECRET || '').trim();
  if (!raw) {
    throw new OTPConfigError('OTP_HASH_SECRET is not set. Set it to a random hex string of at least 64 characters (see docs/SECURITY_REMEDIATION_FINAL_REPORT.md, "OTP_HASH_SECRET").');
  }
  if (!HEX_RE.test(raw) || raw.length % 2 !== 0 || raw.length / 2 < MIN_SECRET_BYTES) {
    throw new OTPConfigError(`OTP_HASH_SECRET must be a hex string encoding at least ${MIN_SECRET_BYTES} bytes (64 hex characters).`);
  }
  return Buffer.from(raw, 'hex');
}

// Startup check, called once from index.js. Fails the process before it serves any request.
function assertOtpConfigured() {
  otpKey();
  return true;
}

// Digest of one code, bound to the email and purpose so equal codes for different records differ.
// Returns 64 lowercase hex characters.
function hashOtp(code, email = '', type = '') {
  const message = `otp-v1|${String(email).trim().toLowerCase()}|${String(type)}|${String(code)}`;
  return crypto.createHmac('sha256', otpKey()).update(message).digest('hex');
}

// Constant-time comparison of two hex digests. Unequal lengths compare false without timing leaks.
function digestsEqual(a, b) {
  const x = Buffer.from(String(a || ''), 'utf8');
  const y = Buffer.from(String(b || ''), 'utf8');
  if (x.length !== y.length) return false;
  return crypto.timingSafeEqual(x, y);
}

class OTPService {
  constructor(db) {
    this.db = db;
    this.maxAttempts = 5;
    this.expiryMinutes = 10;
  }

  async generateOTP(email, type, ipAddress) {
    otpKey(); // fail before writing anything if the key is missing
    if (!await this._checkRateLimit(email, ipAddress)) {
      throw new Error('Too many requests. Please try again later.');
    }

    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');

    await this.db.execute(
      `INSERT INTO verification_codes (email, code, type, ip_address, expires_at)
       VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ${this.expiryMinutes} MINUTE))`,
      [email, hashOtp(code, email, type), type, ipAddress]
    );

    return code;
  }

  async verifyOTP(email, code, type) {
    otpKey();
    const [rows] = await this.db.execute(
      `SELECT id, attempts, code AS digest FROM verification_codes
       WHERE email = ? AND type = ? AND status = 'pending'
       ORDER BY created_at DESC LIMIT 1`,
      [email, type]
    );

    if (!rows.length) throw new Error('Verification code not found or already used.');

    const record = rows[0];

    // Check expiry
    const [expRows] = await this.db.execute(
      'SELECT 1 FROM verification_codes WHERE id = ? AND expires_at >= NOW()',
      [record.id]
    );
    if (!expRows.length) throw new Error('Verification code has expired. Please request a new one.');

    if (record.attempts >= this.maxAttempts) {
      throw new Error('Too many failed attempts. Please request a new code.');
    }

    if (digestsEqual(record.digest, hashOtp(code, email, type))) {
      // Single use: the row leaves the 'pending' state, so a repeat submission finds nothing.
      const [res] = await this.db.execute(
        "UPDATE verification_codes SET status = 'verified' WHERE id = ? AND status = 'pending'",
        [record.id]
      );
      // Zero rows changed means a concurrent request already used this code.
      if (!res || res.affectedRows !== 1) throw new Error('Verification code not found or already used.');
      return true;
    }

    await this.db.execute(
      'UPDATE verification_codes SET attempts = attempts + 1 WHERE id = ?',
      [record.id]
    );
    throw new Error('Invalid verification code.');
  }

  async isVerified(email, type) {
    const [rows] = await this.db.execute(
      `SELECT id FROM verification_codes
       WHERE email = ? AND type = ? AND status = 'verified'
       AND created_at >= DATE_SUB(NOW(), INTERVAL 30 MINUTE)
       ORDER BY created_at DESC LIMIT 1`,
      [email, type]
    );
    return rows.length > 0;
  }

  async _checkRateLimit(email, ipAddress) {
    const [emailRows] = await this.db.execute(
      `SELECT COUNT(*) AS c FROM verification_codes
       WHERE email = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
      [email]
    );
    if (emailRows[0].c >= 3) return false;

    const [ipRows] = await this.db.execute(
      `SELECT COUNT(*) AS c FROM verification_codes
       WHERE ip_address = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
      [ipAddress]
    );
    if (ipRows[0].c >= 10) return false;

    return true;
  }
}

module.exports = OTPService;
module.exports.hashOtp = hashOtp;
module.exports.assertOtpConfigured = assertOtpConfigured;
module.exports.OTPConfigError = OTPConfigError;
module.exports.digestsEqual = digestsEqual;
