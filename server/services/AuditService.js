/**
 * Activity logger. Mirrors api/services/AuditService.php.
 */
class AuditService {
  constructor(db) {
    this.db = db;
  }

  async log(userId, action, targetType, targetId, details = '') {
    try {
      await this.db.execute(
        'INSERT INTO audit_logs (user_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)',
        [userId, action, targetType, String(targetId), details]
      );
    } catch (err) {
      console.error('Audit log failure:', err.message);
    }
  }
}

module.exports = AuditService;
