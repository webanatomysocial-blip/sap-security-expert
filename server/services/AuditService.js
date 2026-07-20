class AuditService {
  constructor(db) {
    this.db = db;
  }

  /**
   * @param {object} opts
   * @param {number|null}  opts.userId     - admin/user ID performing the action
   * @param {string|null}  opts.actor      - display name / username
   * @param {string}       opts.action     - e.g. 'member_approved'
   * @param {string|null}  opts.targetType - e.g. 'member', 'blog', 'setting'
   * @param {string|null}  opts.targetId   - record identifier
   * @param {string|null}  opts.details    - human-readable summary
   * @param {string|null}  opts.ip         - requester IP
   */
  async log({ userId = null, actor = null, action, targetType = null, targetId = null, details = null, ip = null } = {}) {
    try {
      await this.db.execute(
        'INSERT INTO audit_logs (user_id, actor, action, target_type, target_id, details, ip) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, actor, action, targetType, targetId != null ? String(targetId) : null, details, ip]
      );
    } catch (err) {
      console.error('[AuditService] log failure:', err.message);
    }
  }

  /** Convenience: build an AuditService from an Express request's session */
  static fromRequest(db, req) {
    const svc = new AuditService(db);
    svc._userId = req.session?.admin_id || null;
    svc._actor = req.session?.admin_user || null;
    svc._ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim() || null;
    return svc;
  }

  /** Shorthand: log with actor/IP already bound from the request */
  async logReq(action, targetType, targetId, details) {
    await this.log({
      userId: this._userId,
      actor: this._actor,
      action,
      targetType,
      targetId,
      details,
      ip: this._ip,
    });
  }
}

module.exports = AuditService;
