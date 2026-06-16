const router = require('express').Router();
const { requireAuth } = require('../../middleware/auth');
const { checkPermission } = require('../../middleware/permissions');
const { deleteImage } = require('../../utils/helpers');

// GET /api/ads  or  GET /api/admin/ads
router.get('/', requireAuth({ allowPublic: true }), async (req, res) => {
  const db = req.db;
  try {
    if (req.query.zone) {
      const [rows] = await db.execute('SELECT * FROM ads WHERE zone=?', [req.query.zone]);
      return res.json(rows[0] || { active: 0 });
    }
    const [rows] = await db.execute('SELECT * FROM ads');
    const map = {};
    rows.forEach(r => { map[r.zone] = r; });
    return res.json(map);
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/ads  or  POST /api/admin/ads
router.post('/', requireAuth(), checkPermission('can_manage_ads'), async (req, res) => {
  const db = req.db;
  const { zone, image = '', link = '', active = false } = req.body || {};
  if (!zone) return res.status(400).json({ status: 'error', message: 'Zone is required' });

  try {
    const [existing] = await db.execute('SELECT * FROM ads WHERE zone=?', [zone]);
    const isActive = active ? 1 : 0;

    if (existing.length) {
      const cur = existing[0];
      let resetClicks = false;
      if (image && cur.image !== image) { if (cur.image) deleteImage(cur.image); resetClicks = true; }
      if (link !== cur.link) resetClicks = true;

      if (resetClicks) {
        await db.execute('UPDATE ads SET image=?, link=?, active=?, status=?, clicks=0 WHERE zone=?',
          [image, link, isActive, isActive ? 'active' : 'inactive', zone]);
      } else {
        await db.execute('UPDATE ads SET image=?, link=?, active=?, status=? WHERE zone=?',
          [image, link, isActive, isActive ? 'active' : 'inactive', zone]);
      }
    } else {
      await db.execute('INSERT INTO ads (zone, image, link, active, status, clicks) VALUES (?,?,?,?,?,0)',
        [zone, image, link, isActive, isActive ? 'active' : 'inactive']);
    }

    return res.json({ status: 'success', message: 'Ad updated' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/ads/click
router.post('/click', async (req, res) => {
  const db = req.db;
  const { zone } = req.body || {};
  if (!zone) return res.status(400).json({ status: 'error', message: 'Zone required' });
  try {
    await db.execute("UPDATE ads SET clicks = COALESCE(clicks,0) + 1 WHERE zone=?", [zone]);
    return res.json({ status: 'success' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
