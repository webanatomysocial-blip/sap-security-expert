const router = require('express').Router();
const { requireAdmin } = require('../../middleware/auth');

// Auto-create table if not exists — runs once on first request
async function ensureTable(db) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS changelogs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      version VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'feature',
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// GET /api/admin/changelog
router.get('/', requireAdmin, async (req, res) => {
  try {
    await ensureTable(req.db);
    const [rows] = await req.db.execute(
      `SELECT c.*, COALESCE(u.full_name, u.username) AS author_name
       FROM changelogs c LEFT JOIN users u ON u.id = c.created_by
       ORDER BY c.created_at DESC`
    );
    return res.json({ status: 'success', logs: rows });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/admin/changelog
router.post('/', requireAdmin, async (req, res) => {
  const { version, title, description, type } = req.body || {};
  if (!version || !title || !description) {
    return res.status(400).json({ status: 'error', message: 'version, title, and description are required' });
  }
  try {
    await ensureTable(req.db);
    await req.db.execute(
      'INSERT INTO changelogs (version, title, description, type, created_by) VALUES (?, ?, ?, ?, ?)',
      [version, title, description, type || 'feature', req.session.admin_id]
    );
    return res.json({ status: 'success', message: 'Changelog entry added.' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// PUT /api/admin/changelog/:id
router.put('/:id', requireAdmin, async (req, res) => {
  const { version, title, description, type } = req.body || {};
  try {
    await req.db.execute(
      'UPDATE changelogs SET version=?, title=?, description=?, type=? WHERE id=?',
      [version, title, description, type || 'feature', req.params.id]
    );
    return res.json({ status: 'success', message: 'Updated.' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// DELETE /api/admin/changelog/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await req.db.execute('DELETE FROM changelogs WHERE id=?', [req.params.id]);
    return res.json({ status: 'success', message: 'Deleted.' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
