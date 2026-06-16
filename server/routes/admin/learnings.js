const router = require('express').Router();
const { requireAdmin } = require('../../middleware/auth');
const { deleteImage } = require('../../utils/helpers');
const CacheService = require('../../services/CacheService');

const cache = new CacheService(1800);

const MODULE_CATEGORIES = [
  'security-fundamentals',
  'user-management',
  'role-management',
  'authorization-concepts',
  'audit-compliance',
  'grc-advanced',
];

// GET /api/admin/learnings
router.get('/', requireAdmin, async (req, res) => {
  const db = req.db;
  try {
    const [rows] = await db.execute(
      `SELECT id, title, slug, excerpt, content, image, image_alt, category,
              secondary_categories, tags, faqs, status, submission_status,
              date, created_at, updated_at, view_count, seo_score, plagiarism_score,
              co_authors, related_blogs, schema_type, article_section,
              meta_title, meta_description, meta_keywords,
              cta_title, cta_description, cta_button_text, cta_button_link,
              is_members_only, send_notification_email,
              author, author_id
       FROM blogs
       WHERE \`type\` = 'learning'
       ORDER BY created_at DESC`
    );
    return res.json(rows);
  } catch (err) {
    console.error('[GET /admin/learnings]', err.message);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/admin/learnings — create or update
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
      faqs = [],
      cta_title = null,
      cta_description = null,
      cta_button_text = null,
      cta_button_link = null,
      meta_title = '',
      meta_description = '',
      meta_keywords = '',
      schema_type = 'Article',
      article_section = null,
      co_authors = [],
      related_blogs = [],
      seo_score = 0,
      is_members_only = 0,
      send_notification_email = 0,
      status: requestedStatus,
    } = data;

    const category = MODULE_CATEGORIES.includes(data.category) ? data.category : 'security-fundamentals';

    // secondary_categories — for learnings we ignore these (module = primary only)
    const secondaryCatsJson = '[]';

    let slug = data.slug || '';
    if (!slug && title) {
      slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    if (slug) {
      const base = slug;
      let counter = 1;
      while (true) {
        const [existing] = await db.execute(
          'SELECT id FROM blogs WHERE slug = ? AND id != ?',
          [slug, id || '']
        );
        if (!existing.length) break;
        slug = `${base}-${++counter}`;
      }
    }

    const targetStatus = requestedStatus || 'approved';
    const faqsJson = JSON.stringify(Array.isArray(faqs) ? faqs : []);
    const coAuthorsJson = JSON.stringify(Array.isArray(co_authors) ? co_authors : []);
    const relatedBlogsJson = typeof related_blogs === 'string' ? related_blogs : JSON.stringify(Array.isArray(related_blogs) ? related_blogs : []);

    if (id) {
      const [rows] = await db.execute("SELECT id FROM blogs WHERE id = ? AND `type` = 'learning'", [id]);
      if (!rows.length) return res.status(404).json({ status: 'error', message: 'Learning not found' });

      await db.execute(
        `UPDATE blogs SET
         title=?, slug=?, excerpt=?, content=?, category=?,
         secondary_categories=?,
         date=COALESCE(NULLIF(?,''),CURRENT_DATE),
         image=?, image_alt=?, tags=?, faqs=?,
         cta_title=?, cta_description=?, cta_button_text=?, cta_button_link=?,
         meta_title=?, meta_description=?, meta_keywords=?,
         schema_type=?, article_section=?,
         co_authors=?, related_blogs=?,
         seo_score=?, is_members_only=?, send_notification_email=?,
         status=?, submission_status=?,
         updated_at=CURRENT_TIMESTAMP
         WHERE id=? AND \`type\`='learning'`,
        [title, slug, excerpt, content, category,
         secondaryCatsJson,
         date || '', image, image_alt || null, tags, faqsJson,
         cta_title, cta_description, cta_button_text, cta_button_link,
         meta_title, meta_description, meta_keywords,
         schema_type || 'Article', article_section || null,
         coAuthorsJson, relatedBlogsJson,
         seo_score, is_members_only ? 1 : 0, send_notification_email ? 1 : 0,
         targetStatus, targetStatus, id]
      );
      cache.invalidate('learning_counts');
      return res.json({ status: 'success', message: 'Learning updated' });
    } else {
      const newId = `learning_${Date.now()}`;
      const publishDate = ['approved', 'published'].includes(targetStatus)
        ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null;

      await db.execute(
        `INSERT INTO blogs
         (id, title, slug, excerpt, content, author, author_id, date, image, image_alt,
          category, secondary_categories, \`type\`, tags, faqs,
          cta_title, cta_description, cta_button_text, cta_button_link,
          meta_title, meta_description, meta_keywords,
          schema_type, article_section, co_authors, related_blogs,
          seo_score, plagiarism_score, plagiarism_status,
          status, submission_status,
          is_members_only, send_notification_email,
          publish_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?,
                 COALESCE(NULLIF(?,''),CURRENT_DATE), ?, ?,
                 ?, ?, 'learning', ?, ?,
                 ?, ?, ?, ?,
                 ?, ?, ?,
                 ?, ?, ?, ?,
                 ?, 0, 'completed',
                 ?, ?,
                 ?, ?,
                 ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [newId, title, slug, excerpt, content, adminName, adminId,
         date || '', image, image_alt || null,
         category, secondaryCatsJson, tags, faqsJson,
         cta_title, cta_description, cta_button_text, cta_button_link,
         meta_title, meta_description, meta_keywords,
         schema_type || 'Article', article_section || null, coAuthorsJson, relatedBlogsJson,
         seo_score,
         targetStatus, targetStatus,
         is_members_only ? 1 : 0, send_notification_email ? 1 : 0,
         publishDate]
      );
      cache.invalidate('learning_counts');
      return res.json({ status: 'success', message: 'Learning created', id: newId });
    }
  } catch (err) {
    console.error('[POST /admin/learnings]', err.message);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// DELETE /api/admin/learnings/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  const db = req.db;
  const { id } = req.params;
  try {
    const [rows] = await db.execute(
      "SELECT image FROM blogs WHERE (id = ? OR slug = ?) AND `type` = 'learning'",
      [id, id]
    );
    if (!rows.length) return res.status(404).json({ status: 'error', message: 'Learning not found' });
    if (rows[0].image) deleteImage(rows[0].image);
    await db.execute("DELETE FROM blogs WHERE (id = ? OR slug = ?) AND `type` = 'learning'", [id, id]);
    cache.invalidate('learning_counts');
    return res.json({ status: 'success', message: 'Learning deleted' });
  } catch (err) {
    console.error('[DELETE /admin/learnings]', err.message);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
