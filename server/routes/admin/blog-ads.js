const router = require('express').Router();
const { requireAdmin } = require('../../middleware/auth');
const { deleteImage } = require('../../utils/helpers');
const { isSQLite } = require('../../db');

// Auto-create table. blog_ads has no entry in server/migrations/ — this lazy
// CREATE TABLE IF NOT EXISTS is the only thing that ever creates it, in both
// dev (SQLite) and production (MySQL/MariaDB). The two engines don't share a
// single portable syntax for an auto-incrementing primary key (SQLite:
// INTEGER PRIMARY KEY AUTOINCREMENT, MySQL: INT AUTO_INCREMENT PRIMARY KEY),
// and MySQL/MariaDB additionally rejects non-NULL literal DEFAULT values on
// TEXT/BLOB columns — so the short enum-like/string columns below use
// VARCHAR, matching how every other table with a non-NULL string default is
// defined in server/migrations/schema.sql.
async function ensureTable(db) {
  if (isSQLite) {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS blog_ads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ad_type TEXT NOT NULL DEFAULT 'inline',
        target TEXT NOT NULL DEFAULT 'all',
        blog_slugs TEXT DEFAULT NULL,
        position INTEGER DEFAULT 3,
        image TEXT NOT NULL DEFAULT '',
        link TEXT DEFAULT '',
        title TEXT DEFAULT '',
        active INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } else {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS blog_ads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ad_type VARCHAR(50) NOT NULL DEFAULT 'inline',
        target VARCHAR(50) NOT NULL DEFAULT 'all',
        blog_slugs TEXT DEFAULT NULL,
        position INT DEFAULT 3,
        image VARCHAR(500) NOT NULL DEFAULT '',
        link VARCHAR(500) DEFAULT '',
        title VARCHAR(255) DEFAULT '',
        active TINYINT DEFAULT 0,
        clicks INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
}

// GET /api/admin/blog-ads — list all (admin only)
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    await ensureTable(req.db);
    const [rows] = await req.db.execute('SELECT * FROM blog_ads ORDER BY created_at DESC');
    rows.forEach(r => {
      try { r.blog_slugs = r.blog_slugs ? JSON.parse(r.blog_slugs) : []; } catch { r.blog_slugs = []; }
    });
    return res.json({ status: 'success', ads: rows });
  } catch (err) {
    return next(err);
  }
});

// GET /api/blog-ads/for-blog?slug=xxx — public, returns active ads for a blog
router.get('/for-blog', async (req, res, next) => {
  const { slug } = req.query;
  try {
    await ensureTable(req.db);
    const [rows] = await req.db.execute(
      "SELECT * FROM blog_ads WHERE active = 1"
    );
    const matching = rows.filter(r => {
      if (r.target === 'all') return true;
      try {
        const slugs = r.blog_slugs ? JSON.parse(r.blog_slugs) : [];
        return slugs.includes(slug);
      } catch { return false; }
    });
    matching.forEach(r => {
      try { r.blog_slugs = r.blog_slugs ? JSON.parse(r.blog_slugs) : []; } catch { r.blog_slugs = []; }
    });
    return res.json({ status: 'success', ads: matching });
  } catch (err) {
    return next(err);
  }
});

// POST /api/admin/blog-ads — create or update (admin only)
router.post('/', requireAdmin, async (req, res, next) => {
  const { id, ad_type = 'inline', target = 'all', blog_slugs = [], position = 3, image = '', link = '', title = '', active = false } = req.body || {};
  try {
    await ensureTable(req.db);
    const slugsJson = JSON.stringify(Array.isArray(blog_slugs) ? blog_slugs : []);
    const isActive = active ? 1 : 0;

    if (id) {
      const [existing] = await req.db.execute('SELECT image FROM blog_ads WHERE id=? LIMIT 1', [id]);
      if (existing.length && image && existing[0].image !== image && existing[0].image) {
        deleteImage(existing[0].image);
      }
      await req.db.execute(
        'UPDATE blog_ads SET ad_type=?, target=?, blog_slugs=?, position=?, image=?, link=?, title=?, active=? WHERE id=?',
        [ad_type, target, slugsJson, position, image, link, title, isActive, id]
      );
    } else {
      await req.db.execute(
        'INSERT INTO blog_ads (ad_type, target, blog_slugs, position, image, link, title, active) VALUES (?,?,?,?,?,?,?,?)',
        [ad_type, target, slugsJson, position, image, link, title, isActive]
      );
    }
    return res.json({ status: 'success', message: 'Ad saved.' });
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/admin/blog-ads/:id/toggle — quick toggle active
router.patch('/:id/toggle', requireAdmin, async (req, res, next) => {
  try {
    await ensureTable(req.db);
    await req.db.execute('UPDATE blog_ads SET active = CASE WHEN active=1 THEN 0 ELSE 1 END WHERE id=?', [req.params.id]);
    return res.json({ status: 'success' });
  } catch (err) {
    return next(err);
  }
});

// POST /api/blog-ads/click/:id — public click tracking
router.post('/click/:id', async (req, res) => {
  try {
    await req.db.execute('UPDATE blog_ads SET clicks = COALESCE(clicks,0)+1 WHERE id=?', [req.params.id]);
    return res.json({ status: 'success' });
  } catch { return res.json({ status: 'ok' }); }
});

// DELETE /api/admin/blog-ads/:id (admin only)
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const [rows] = await req.db.execute('SELECT image FROM blog_ads WHERE id=? LIMIT 1', [req.params.id]);
    if (rows.length && rows[0].image) deleteImage(rows[0].image);
    await req.db.execute('DELETE FROM blog_ads WHERE id=?', [req.params.id]);
    return res.json({ status: 'success', message: 'Ad deleted.' });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
