const router = require('express').Router();
const { requireAdmin } = require('../../middleware/auth');
const { adminOverridePrice, OwnershipError } = require('../../utils/fileOwnership');

// GET /api/admin/file-ownership?review=1 — files with an owner, optionally only those flagged for review
router.get('/', requireAdmin, async (req, res) => {
  const only = req.query.review === '1' ? 'WHERE needs_review = 1' : '';
  const [rows] = await req.db.execute(`SELECT file_url, owner_user_id, price_credits, source, needs_review, deleted_at FROM file_ownership ${only} ORDER BY file_url LIMIT 500`);
  return res.json({ status: 'success', files: rows });
});

// POST /api/admin/file-ownership/price  { file_url, credits, reason }
router.post('/price', requireAdmin, async (req, res) => {
  const { file_url, credits, reason } = req.body || {};
  try {
    await adminOverridePrice(req.db, {
      fileUrl: String(file_url || ''), adminUserId: req.session.admin_id, isAdmin: req.session.role === 'admin',
      credits: Number(credits), reason,
    });
    return res.json({ status: 'success', message: 'Price updated and recorded.' });
  } catch (err) {
    if (err instanceof OwnershipError) return res.status(err.status).json({ status: 'error', message: err.message });
    console.error('[file-ownership]', err.message);
    return res.status(500).json({ status: 'error', message: 'Could not update the price.' });
  }
});

module.exports = router;
