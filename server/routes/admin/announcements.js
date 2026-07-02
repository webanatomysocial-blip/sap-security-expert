const router = require('express').Router();
const { requireAuth } = require('../../middleware/auth');
const { checkPermission } = require('../../middleware/permissions');
const CacheService = require('../../services/CacheService');

const cache = new CacheService(1800);

const generateSlug = (title) =>
  title.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');

// Public-safe columns (no internal draft/admin fields exposed to guests)
const PUBLIC_COLS = 'id, title, slug, date, link, content, excerpt, image, image_alt, status, views, comments, created_at, updated_at';

// GET /api/announcements  or  GET /api/admin/announcements
router.get('/', requireAuth({ allowPublic: true }), async (req, res) => {
  const db = req.db;
  const isAdmin = req.session.admin_logged_in && req.session.role === 'admin';
  try {
    let rows;
    if (isAdmin) {
      [rows] = await db.execute('SELECT * FROM announcements ORDER BY created_at DESC');
    } else {
      [rows] = await db.execute(
        `SELECT ${PUBLIC_COLS} FROM announcements WHERE status IN ('approved','active','published') ORDER BY created_at DESC`
      );
    }
    return res.json(rows);
  } catch (err) {
    console.error('[announcements GET /]', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to load announcements.' });
  }
});

// GET /api/admin/announcements/:slug
router.get('/:slug', requireAuth({ allowPublic: true }), async (req, res) => {
  const db = req.db;
  const { slug } = req.params;
  const isAdmin = req.session.admin_logged_in && req.session.role === 'admin';
  try {
    const cols = isAdmin ? '*' : PUBLIC_COLS;
    const statusFilter = isAdmin ? '' : " AND status IN ('approved','active','published')";
    const [rows] = await db.execute(
      `SELECT ${cols} FROM announcements WHERE (slug=? OR id=?)${statusFilter} LIMIT 1`,
      [slug, slug]
    );
    if (!rows.length) return res.status(404).json({ status: 'error', message: 'Not found' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('[announcements GET /:slug]', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to load announcement.' });
  }
});

// POST /api/admin/announcements
router.post('/', requireAuth(), checkPermission('can_manage_announcements'), async (req, res) => {
  const db = req.db;
  const isAdmin = req.session.role === 'admin';
  const {
    id, title = '', date, link = '',
    content = '', excerpt = '', image = '', image_alt = '',
    status: reqStatus,
  } = req.body || {};

  const slug = generateSlug(title);
  const mysqlDate = date
    ? new Date(date).toISOString().slice(0, 19).replace('T', ' ')
    : null;

  try {
    if (id) {
      const [rows] = await db.execute('SELECT status, submission_status FROM announcements WHERE id=?', [id]);
      if (!rows.length) return res.status(404).json({ status: 'error', message: 'Not found' });
      const ex = rows[0];

      if (ex.status === 'approved' && !isAdmin) {
        await db.execute(
          "UPDATE announcements SET draft_title=?, draft_date=?, draft_link=?, submission_status='edited', updated_at=CURRENT_TIMESTAMP WHERE id=?",
          [title, mysqlDate, link, id]
        );
        cache.invalidate('homepage_data_public');
        return res.json({ status: 'success', message: 'Changes saved for review.' });
      }

      const status = reqStatus || (isAdmin ? 'approved' : 'draft');
      await db.execute(
        `UPDATE announcements SET title=?, slug=?, date=?, link=?, status=?, content=?, excerpt=?, image=?, image_alt=?,
         submission_status='approved', updated_at=CURRENT_TIMESTAMP WHERE id=?`,
        [title, slug, mysqlDate, link, status, content, excerpt, image, image_alt, id]
      );
    } else {
      const status = reqStatus || (isAdmin ? 'approved' : 'draft');
      const submissionStatus = isAdmin ? 'approved' : 'pending';
      await db.execute(
        `INSERT INTO announcements (title, slug, date, link, status, content, excerpt, image, image_alt, views, comments, submission_status)
         VALUES (?,?,?,?,?,?,?,?,?,0,0,?)`,
        [title, slug, mysqlDate, link, status, content, excerpt, image, image_alt, submissionStatus]
      );
    }

    cache.invalidate('homepage_data_public');
    return res.json({ status: 'success', message: id ? 'Announcement updated' : 'Announcement created' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// DELETE /api/admin/announcements
router.delete('/', requireAuth(), checkPermission('can_manage_announcements'), async (req, res) => {
  const db = req.db;
  const id = req.query.id || req.body?.id;
  if (!id) return res.status(400).json({ status: 'error', message: 'ID required' });
  try {
    await db.execute('DELETE FROM announcements WHERE id=?', [id]);
    cache.invalidate('homepage_data_public');
    return res.json({ status: 'success', message: 'Deleted' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/admin/announcements/:id/review
router.post('/:id/review', requireAuth(), checkPermission('can_manage_announcements'), async (req, res) => {
  const db = req.db;
  const { id } = req.params;
  const { action } = req.body || {};

  try {
    const [rows] = await db.execute('SELECT * FROM announcements WHERE id=?', [id]);
    if (!rows.length) return res.status(404).json({ status: 'error', message: 'Not found' });
    const ann = rows[0];

    if (action === 'approve') {
      if (ann.submission_status === 'edited') {
        await db.execute(
          `UPDATE announcements SET
           title=COALESCE(draft_title,title), date=COALESCE(draft_date,date), link=COALESCE(draft_link,link),
           draft_title=NULL, draft_date=NULL, draft_link=NULL,
           submission_status='approved', status='approved', updated_at=CURRENT_TIMESTAMP WHERE id=?`,
          [id]
        );
      } else {
        await db.execute(
          "UPDATE announcements SET submission_status='approved', status='approved', updated_at=CURRENT_TIMESTAMP WHERE id=?",
          [id]
        );
      }
      cache.invalidate('homepage_data_public');
      return res.json({ status: 'success', message: 'Approved' });
    } else {
      if (ann.submission_status === 'edited') {
        await db.execute(
          "UPDATE announcements SET draft_title=NULL, draft_date=NULL, draft_link=NULL, submission_status='approved', updated_at=CURRENT_TIMESTAMP WHERE id=?",
          [id]
        );
      } else {
        await db.execute('DELETE FROM announcements WHERE id=?', [id]);
      }
      cache.invalidate('homepage_data_public');
      return res.json({ status: 'success', message: 'Rejected' });
    }
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
