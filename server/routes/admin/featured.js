const router = require('express').Router();
const { requireAdmin } = require('../../middleware/auth');
const CacheService = require('../../services/CacheService');
const cache = new CacheService(1800);

// All routes mounted at /api/admin/featured-insights

// ── GET — current selection + all eligible (published) blogs for the picker ───
router.get('/', requireAdmin, async (req, res) => {
  const db = req.db;
  try {
    const [blogs] = await db.execute(
      `SELECT id, title, slug, category, image, homepage_featured_image, homepage_featured_order
       FROM blogs
       WHERE status IN ('approved','published') AND (type IS NULL OR type = 'blog')
       ORDER BY CASE WHEN homepage_featured_order > 0 THEN 0 ELSE 1 END,
                homepage_featured_order ASC, date DESC, id DESC`
    );
    const selected = blogs
      .filter(b => b.homepage_featured_order > 0)
      .sort((a, b) => a.homepage_featured_order - b.homepage_featured_order);
    return res.json({ status: 'success', blogs, selected });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// ── POST — save the curated selection (ordered, max 3) ────────────────────────
// Body: { items: [{ id, homepage_featured_image }] }  (order = array index)
router.post('/', requireAdmin, async (req, res) => {
  const db = req.db;
  const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 3) : [];

  try {
    // Reset all to 0 (= not featured). Avoids NULL so NOT NULL columns are safe.
    await db.execute('UPDATE blogs SET homepage_featured_order = 0 WHERE homepage_featured_order > 0');

    // Apply the new ordered selection (1, 2, 3).
    let order = 1;
    for (const item of items) {
      if (!item || !item.id) continue;
      await db.execute(
        'UPDATE blogs SET homepage_featured_order = ?, homepage_featured_image = ? WHERE id = ?',
        [order, item.homepage_featured_image || null, item.id]
      );
      order++;
    }

    cache.invalidate('homepage_data_public');
    return res.json({ status: 'success', message: 'Featured Insights updated.' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
