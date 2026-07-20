const router = require('express').Router();
const { requireAdmin } = require('../../middleware/auth');

// GET /api/admin/audit-logs?page=1&limit=50&action=&actor=
router.get('/', requireAdmin, async (req, res) => {
  const db = req.db;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
  const offset = (page - 1) * limit;
  const action = req.query.action || '';
  const actor = req.query.actor || '';

  try {
    const conditions = [];
    const params = [];

    if (action) {
      conditions.push('action = ?');
      params.push(action);
    }
    if (actor) {
      conditions.push('actor LIKE ?');
      params.push(`%${actor}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) AS total FROM audit_logs ${where}`,
      params
    );

    const [rows] = await db.execute(
      `SELECT id, user_id, actor, action, target_type, target_id, details, ip, created_at
       FROM audit_logs ${where}
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({ status: 'success', logs: rows, total, page, limit });
  } catch (err) {
    console.error('[audit-logs]', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch audit logs.' });
  }
});

module.exports = router;
