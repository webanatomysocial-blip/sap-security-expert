const router = require('express').Router();
const { requireAdmin } = require('../../middleware/auth');
const { deleteImage } = require('../../utils/helpers');
const CacheService = require('../../services/CacheService');

const cache = new CacheService(1800);

// GET /api/admin/news  — list all news items (all statuses)
router.get('/', requireAdmin, async (req, res) => {
  const db = req.db;
  try {
    const [rows] = await db.execute(
      `SELECT id, title, slug, excerpt, content, image, image_alt, status, date,
              created_at, updated_at, view_count,
              tags, faqs,
              cta_title, cta_description, cta_button_text, cta_button_link,
              meta_title, meta_description, meta_keywords
       FROM blogs
       WHERE \`type\` = 'news'
       ORDER BY created_at DESC`
    );
    return res.json(rows);
  } catch (err) {
    console.error('[GET /admin/news]', err.message);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/admin/news  — create or update a news item
router.post('/', requireAdmin, async (req, res) => {
  const db = req.db;
  const sess = req.session;
  const adminId = sess.admin_id;
  const adminName = 'Raghu Boddu';

  try {
    const data = req.body || {};
    const {
      id,
      title = '',
      excerpt = '',
      content = '',
      date,
      image = '',
      image_alt = '',
      tags = '',
      meta_title = '',
      meta_description = '',
      meta_keywords = '',
      faqs = [],
      cta_title = null,
      cta_description = null,
      cta_button_text = null,
      cta_button_link = null,
      status: requestedStatus,
    } = data;

    let slug = data.slug || '';
    if (!slug && title) {
      slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    // Ensure slug uniqueness
    if (slug) {
      const base = slug;
      let counter = 1;
      while (true) {
        const [existing] = await db.execute(
          'SELECT id FROM blogs WHERE slug = ? AND id != ?',
          [slug, id || '']
        );
        if (!existing.length) break;
        counter++;
        slug = `${base}-${counter}`;
      }
    }

    const targetStatus = requestedStatus || 'approved';
    const faqsJson = JSON.stringify(Array.isArray(faqs) ? faqs : []);

    if (id) {
      const [rows] = await db.execute('SELECT id, image FROM blogs WHERE id = ? AND `type` = ?', [id, 'news']);
      if (!rows.length) return res.status(404).json({ status: 'error', message: 'News item not found' });

      await db.execute(
        `UPDATE blogs SET
         title=?, slug=?, excerpt=?, content=?, date=COALESCE(NULLIF(?,''),CURRENT_DATE),
         image=?, image_alt=?, category='news', tags=?, faqs=?,
         cta_title=?, cta_description=?, cta_button_text=?, cta_button_link=?,
         meta_title=?, meta_description=?, meta_keywords=?,
         status=?, submission_status=?,
         updated_at=CURRENT_TIMESTAMP
         WHERE id=? AND \`type\`='news'`,
        [title, slug, excerpt, content, date || '', image, image_alt || null, tags, faqsJson,
         cta_title, cta_description, cta_button_text, cta_button_link,
         meta_title, meta_description, meta_keywords,
         targetStatus, targetStatus, id]
      );
      cache.invalidate('homepage_data_public');
      return res.json({ status: 'success', message: 'News item updated' });
    } else {
      const newId = `news_${Date.now()}`;
      const publishDate = ['approved', 'published'].includes(targetStatus)
        ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null;

      await db.execute(
        `INSERT INTO blogs
         (id, title, slug, excerpt, content, author, author_id, date, image, image_alt,
          category, \`type\`, tags, faqs,
          cta_title, cta_description, cta_button_text, cta_button_link,
          meta_title, meta_description, meta_keywords,
          status, submission_status, seo_score, plagiarism_score, plagiarism_status,
          is_members_only, send_notification_email, publish_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(NULLIF(?,''),CURRENT_DATE), ?, ?,
                 'news', 'news', ?, ?,
                 ?, ?, ?, ?,
                 ?, ?, ?,
                 ?, ?, 0, 0, 'completed',
                 0, 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [newId, title, slug, excerpt, content, adminName, adminId, date || '', image, image_alt || null,
         tags, faqsJson,
         cta_title, cta_description, cta_button_text, cta_button_link,
         meta_title, meta_description, meta_keywords,
         targetStatus, targetStatus, publishDate]
      );
      cache.invalidate('homepage_data_public');
      return res.json({ status: 'success', message: 'News item created', id: newId });
    }
  } catch (err) {
    console.error('[POST /admin/news]', err.message);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// DELETE /api/admin/news/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  const db = req.db;
  const { id } = req.params;
  try {
    const [rows] = await db.execute(
      "SELECT image FROM blogs WHERE (id = ? OR slug = ?) AND `type` = 'news'",
      [id, id]
    );
    if (!rows.length) return res.status(404).json({ status: 'error', message: 'News item not found' });
    if (rows[0].image) deleteImage(rows[0].image);
    await db.execute("DELETE FROM blogs WHERE (id = ? OR slug = ?) AND `type` = 'news'", [id, id]);
    cache.invalidate('homepage_data_public');
    return res.json({ status: 'success', message: 'News item deleted' });
  } catch (err) {
    console.error('[DELETE /admin/news]', err.message);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
