const router = require('express').Router();
const { requireAdmin } = require('../../middleware/auth');
const { requireAuth } = require('../../middleware/auth');
const { checkPermission } = require('../../middleware/permissions');
const NotificationService = require('../../services/NotificationService');
const MailService = require('../../services/MailService');
const CacheService = require('../../services/CacheService');

const cache = new CacheService(1800);

// GET /api/admin/blogs/pending  — pending review queue
router.get('/pending', requireAuth(), checkPermission('can_review_blogs'), async (req, res) => {
  const db = req.db;
  const status = req.query.status || 'pending';

  try {
    let sql;
    const params = [];

    // Author fields match what BlogPreviewModal expects: author_name, author_image, author_bio
    const authorFields = `
      u.email AS author_email,
      COALESCE(c.full_name, u.username) AS author_display,
      CASE
        WHEN u.role = 'admin' OR b.author_id IS NULL OR b.author_id = 1 THEN 'Raghu Boddu'
        ELSE COALESCE(c.full_name, u.full_name, u.username, b.author)
      END AS author_name,
      CASE
        WHEN u.role = 'admin' OR b.author_id IS NULL OR b.author_id = 1 THEN '/assets/raghu_boddu.png'
        ELSE COALESCE(c.image, u.profile_image)
      END AS author_image,
      COALESCE(c.short_bio, u.bio, 'Expert SAP Security Contributor.') AS author_bio,
      COALESCE(c.designation, u.designation) AS author_designation,
      COALESCE(c.linkedin, u.linkedin) AS author_linkedin`;

    if (status === 'rejected') {
      sql = `SELECT b.*, ${authorFields}
             FROM blogs b
             LEFT JOIN users u ON b.author_id = u.id
             LEFT JOIN contributors c ON u.contributor_id = c.id
             WHERE b.submission_status = 'rejected'
             ORDER BY b.updated_at DESC`;
    } else if (status === 'edited') {
      sql = `SELECT b.*, ${authorFields}
             FROM blogs b
             LEFT JOIN users u ON b.author_id = u.id
             LEFT JOIN contributors c ON u.contributor_id = c.id
             WHERE b.submission_status = 'edited'
             ORDER BY b.updated_at DESC`;
    } else {
      sql = `SELECT b.*, ${authorFields}
             FROM blogs b
             LEFT JOIN users u ON b.author_id = u.id
             LEFT JOIN contributors c ON u.contributor_id = c.id
             WHERE b.submission_status IN ('submitted','edited')
             ORDER BY b.created_at DESC`;
    }

    const [rows] = await db.execute(sql, params);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// PUT /api/admin/blogs/:id/review
router.put('/:id/review', requireAuth(), checkPermission('can_review_blogs'), async (req, res) => {
  const db = req.db;
  const { id } = req.params;
  const { rejection_reason = '' } = req.body || {};
  // Normalise: frontend sends 'save_as_draft' — treat as 'draft'
  const rawAction = req.body?.action || '';
  const action = rawAction === 'save_as_draft' ? 'draft' : rawAction;

  if (!['approve', 'reject', 'draft'].includes(action)) {
    return res.status(400).json({ status: 'error', message: 'Invalid action. Must be approve, reject, or draft.' });
  }

  try {
    const [rows] = await db.execute(
      `SELECT b.*, u.email AS author_email, COALESCE(c.full_name, u.username) AS author_name
       FROM blogs b
       LEFT JOIN users u ON b.author_id = u.id
       LEFT JOIN contributors c ON u.contributor_id = c.id
       WHERE b.id = ? LIMIT 1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ status: 'error', message: 'Blog not found' });
    const blog = rows[0];

    const mailService = MailService.getInstance(db);
    const notifier = new NotificationService(mailService);

    if (action === 'approve') {
      const isEdited = blog.submission_status === 'edited';

      if (isEdited) {
        // Apply draft columns to live columns
        await db.execute(
          `UPDATE blogs SET
           title=COALESCE(draft_title,title), excerpt=COALESCE(draft_excerpt,excerpt),
           content=COALESCE(draft_content,content), image=COALESCE(draft_image,image),
           image_alt=COALESCE(draft_image_alt,image_alt),
           category=COALESCE(draft_category,category), faqs=COALESCE(draft_faqs,faqs),
           secondary_categories=COALESCE(draft_secondary_categories,secondary_categories),
           meta_title=COALESCE(draft_meta_title,meta_title), meta_description=COALESCE(draft_meta_description,meta_description),
           meta_keywords=COALESCE(draft_meta_keywords,meta_keywords),
           cta_title=COALESCE(draft_cta_title,cta_title), cta_description=COALESCE(draft_cta_description,cta_description),
           cta_button_text=COALESCE(draft_cta_button_text,cta_button_text), cta_button_link=COALESCE(draft_cta_button_link,cta_button_link),
           draft_title=NULL, draft_excerpt=NULL, draft_content=NULL, draft_image=NULL, draft_image_alt=NULL,
           draft_category=NULL, draft_faqs=NULL, draft_secondary_categories=NULL,
           draft_meta_title=NULL, draft_meta_description=NULL,
           draft_meta_keywords=NULL, draft_cta_title=NULL, draft_cta_description=NULL,
           draft_cta_button_text=NULL, draft_cta_button_link=NULL,
           submission_status='approved', status='approved', rejection_feedback=NULL,
           updated_at=CURRENT_TIMESTAMP
           WHERE id=?`,
          [id]
        );
      } else {
        await db.execute(
          `UPDATE blogs SET submission_status='approved', status='approved',
           rejection_feedback=NULL, publish_date=COALESCE(publish_date,CURRENT_TIMESTAMP),
           updated_at=CURRENT_TIMESTAMP WHERE id=?`,
          [id]
        );
      }

      cache.invalidate('homepage_data_public');

      const siteUrl = (process.env.SITE_URL || 'https://sap.webanatomy.in').replace(/\/$/, '');
      const postUrl = `${siteUrl}/${blog.category}/${blog.slug}`;
      if (blog.author_email) notifier.notifyBlogApproved(blog.author_email, blog.title, postUrl).catch(() => {});

      return res.json({ status: 'success', message: 'Blog approved and published.' });

    } else if (action === 'reject') {
      await db.execute(
        `UPDATE blogs SET submission_status='rejected', status='rejected',
         rejection_feedback=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
        [rejection_reason, id]
      );
      if (blog.author_email) notifier.notifyBlogRejected(blog.author_email, blog.title, rejection_reason).catch(() => {});
      return res.json({ status: 'success', message: 'Blog rejected.' });

    } else {
      // draft
      await db.execute(
        `UPDATE blogs SET submission_status='draft', status='draft',
         rejection_feedback=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
        [rejection_reason, id]
      );
      if (blog.author_email) notifier.notifyBlogMovedToDraft(blog.author_email, blog.title, rejection_reason).catch(() => {});
      return res.json({ status: 'success', message: 'Blog moved to draft.' });
    }
  } catch (err) {
    console.error('[review_blog]', err.message);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/admin/blogs/recalculate-plagiarism
router.post('/recalculate-plagiarism', requireAuth(), checkPermission('can_review_blogs'), async (req, res) => {
  const db = req.db;
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ status: 'error', message: 'Blog ID required' });

  try {
    const [rows] = await db.execute('SELECT id, content FROM blogs WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) return res.status(404).json({ status: 'error', message: 'Blog not found' });

    const { checkPlagiarismScore } = require('../../utils/helpers');
    const result = await checkPlagiarismScore(rows[0].content, id, db);
    const score = result.score;

    await db.execute(
      "UPDATE blogs SET plagiarism_score=?, plagiarism_status='completed', updated_at=CURRENT_TIMESTAMP WHERE id=?",
      [score, id]
    );

    return res.json({ status: 'success', plagiarism_score: score });
  } catch (err) {
    console.error('[recalculate-plagiarism]', err.message);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/admin/blogs/bulk-recalculate-plagiarism
router.post('/bulk-recalculate-plagiarism', requireAdmin, async (req, res) => {
  const db = req.db;
  try {
    const [rows] = await db.execute(
      "SELECT id, content FROM blogs WHERE plagiarism_score IS NULL OR plagiarism_score = 0 OR plagiarism_score = -1"
    );
    if (!rows.length) return res.json({ status: 'success', message: 'No blogs need recalculation.', updated: 0 });

    const { checkPlagiarismScore } = require('../../utils/helpers');
    let updated = 0;
    for (const blog of rows) {
      const result = await checkPlagiarismScore(blog.content, blog.id, db).catch(() => ({ score: -1 }));
      await db.execute(
        "UPDATE blogs SET plagiarism_score=?, plagiarism_status='completed', updated_at=CURRENT_TIMESTAMP WHERE id=?",
        [result.score, blog.id]
      );
      updated++;
    }
    return res.json({ status: 'success', message: `Updated ${updated} blog(s).`, updated });
  } catch (err) {
    console.error('[bulk-recalculate-plagiarism]', err.message);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/admin/blogs/toggle-exclusive
router.post('/toggle-exclusive', requireAdmin, async (req, res) => {
  const db = req.db;
  const { id, is_members_only } = req.body || {};
  if (!id) return res.status(400).json({ status: 'error', message: 'ID required' });
  try {
    await db.execute('UPDATE blogs SET is_members_only=? WHERE id=?', [is_members_only ? 1 : 0, id]);
    return res.json({ status: 'success', message: 'Exclusive content setting updated.' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/admin/blogs/toggle-premium
router.post('/toggle-premium', requireAdmin, async (req, res) => {
  const db = req.db;
  const { id, is_premium, credits_required } = req.body || {};
  if (!id) return res.status(400).json({ status: 'error', message: 'ID required' });
  try {
    const isPremium = is_premium ? 1 : 0;
    if (isPremium && credits_required != null) {
      await db.execute(
        'UPDATE blogs SET is_premium=?, credits_required=? WHERE id=?',
        [1, parseInt(credits_required) || 1, id]
      );
    } else {
      await db.execute('UPDATE blogs SET is_premium=? WHERE id=?', [isPremium, id]);
    }
    return res.json({ status: 'success', message: 'Premium setting updated.' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
