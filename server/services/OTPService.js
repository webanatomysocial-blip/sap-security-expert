/**
 * OTP generation and verification.
 * Mirrors api/services/OTPService.php — all datetime logic is DB-native.
 */
class OTPService {
  constructor(db) {
    this.db = db;
    this.maxAttempts = 5;
    this.expiryMinutes = 10;
  }

  async generateOTP(email, type, ipAddress) {
    if (!await this._checkRateLimit(email, ipAddress)) {
      throw new Error('Too many requests. Please try again later.');
    }

    const code = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');

    await this.db.execute(
      `INSERT INTO verification_codes (email, code, type, ip_address, expires_at)
       VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ${this.expiryMinutes} MINUTE))`,
      [email, code, type, ipAddress]
    );

    return code;
  }

  async verifyOTP(email, code, type) {
    const [rows] = await this.db.execute(
      `SELECT id, attempts FROM verification_codes
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

    const [matchRows] = await this.db.execute(
      'SELECT id FROM verification_codes WHERE id = ? AND code = ?',
      [record.id, code]
    );

    if (matchRows.length) {
      await this.db.execute(
        "UPDATE verification_codes SET status = 'verified' WHERE id = ?",
        [record.id]
      );
      return true;
    } else {
      await this.db.execute(
        'UPDATE verification_codes SET attempts = attempts + 1 WHERE id = ?',
        [record.id]
      );
      throw new Error('Invalid verification code.');
    }
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
