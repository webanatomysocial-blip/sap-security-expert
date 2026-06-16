const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const { calculateSeoScore, checkPlagiarismScore, deleteImage } = require('../utils/helpers');
const NotificationService = require('../services/NotificationService');
const MailService = require('../services/MailService');
const CacheService = require('../services/CacheService');

const cache = new CacheService(1800);

// Author info SELECT fragment (reused in GET queries)
const AUTHOR_FIELDS = `
  u.id as author_user_id, u.username as author_username, u.role as author_role,
  CASE
    WHEN u.role = 'admin' OR b.author_id IS NULL OR b.author_id = 1 THEN 'Raghu Boddu'
    ELSE COALESCE(c.full_name, u.full_name, u.username, b.author)
  END as author_name,
  CASE
    WHEN u.role = 'admin' OR b.author_id IS NULL OR b.author_id = 1 THEN '/assets/raghu_boddu.png'
    ELSE COALESCE(c.image, u.profile_image)
  END as author_image,
  COALESCE(c.short_bio, u.bio) as author_bio,
  COALESCE(c.designation, u.designation) as author_designation,
  COALESCE(c.linkedin, u.linkedin) as author_linkedin,
  COALESCE(c.twitter_handle, u.twitter_handle) as author_twitter,
  COALESCE(c.personal_website, u.personal_website) as author_website
`;

// GET /api/posts  or  GET /api/posts/:idOrSlug
router.get('/:idOrSlug?', requireAuth({ allowPublic: true }), async (req, res) => {
  const db = req.db;
  const sess = req.session;
  const isAdmin = sess.admin_logged_in && sess.role === 'admin';
  const isContributor = sess.admin_logged_in && sess.role === 'contributor';
  const currentUserId = sess.admin_id || null;
  const nowUtc = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const authorOnly = req.query.author_only == '1';

  const idOrSlug = req.params.idOrSlug || null;

  try {
    if (idOrSlug) {
      // Single blog
      let sql = `SELECT b.*, b.view_count,
        (SELECT COUNT(*) FROM comments c_count WHERE c_count.post_id = b.slug AND c_count.status = 'approved') as comment_count,
        ${AUTHOR_FIELDS}
        FROM blogs b
        LEFT JOIN users u ON b.author_id = u.id
        LEFT JOIN contributors c ON u.contributor_id = c.id
        WHERE (b.slug = ? OR b.id = ?)`;
      const params = [idOrSlug, idOrSlug];

      if (isContributor && authorOnly) {
        sql += ' AND b.author_id = ?'; params.push(currentUserId);
      } else if (!isAdmin) {
        sql += " AND b.status IN ('approved','published')";
      }

      const [rows] = await db.execute(sql, params);
      const blog = rows[0];
      if (!blog) return res.status(404).json({ error: 'Blog post not found' });

      if (!blog.author_name) {
        blog.author_name = 'Guest Author';
        blog.author_image = 'https://placehold.co/100x100?text=Author';
      }

      // Parse co_authors JSON
      try { blog.co_authors = blog.co_authors ? JSON.parse(blog.co_authors) : []; } catch { blog.co_authors = []; }

      // Exclusivity enforcement (free members gate)
      const isMembersOnly = parseInt(blog.is_members_only || 0);
      const isMember = !!sess.member_logged_in;
      // Super-admins bypass all gates. Contributors bypass members-only gate for their OWN blogs only.
      const isOwnBlog = isContributor && currentUserId && String(blog.author_user_id) === String(currentUserId);
      const hasAdminAccess = isAdmin || isOwnBlog;

      if (isMembersOnly && !isMember && !hasAdminAccess) {
        let teaser = '';
        const pMatch = (blog.content || '').match(/<p>(.*?)<\/p>/is);
        teaser = pMatch ? pMatch[0] : '<p>' + (blog.content || '').replace(/<[^>]+>/g, '').slice(0, 400) + '...</p>';
        blog.content = teaser;
        blog.faqs = null;
        blog.cta_title = 'Professional Content Locked';
        blog.cta_description = 'Join our expert community to access premium SAP security insights.';
        blog.cta_button_text = 'Join Members Area';
        blog.cta_button_link = '/member/signup';
        blog.author = 'SAP Security Expert';
        blog.author_name = 'SAP Security Expert';
        ['author_bio','author_image','author_designation','author_linkedin','author_twitter','author_website'].forEach(k => { blog[k] = null; });
      }

      // Premium paid content gate — content is NEVER sent to non-paying users
      // Only full admins bypass; contributors must subscribe like everyone else.
      const isPremium = parseInt(blog.is_premium || 0);
      if (isPremium && !isAdmin) {
        // Check session cache first, fall back to DB
        let hasPaid = false;
        if (sess.member_logged_in) {
          if (sess.has_premium && sess.premium_expires_at && new Date(sess.premium_expires_at) > new Date()) {
            hasPaid = true;
          } else {
            const [subRows] = await db.execute(
              "SELECT id, expires_at FROM member_subscriptions WHERE member_id = ? AND status = 'active' AND expires_at > NOW() LIMIT 1",
              [sess.member_id]
            );
            hasPaid = subRows.length > 0;
            if (hasPaid) {
              // Cache in session
              req.session.has_premium = true;
              req.session.premium_expires_at = subRows[0]?.expires_at;
            } else {
              req.session.has_premium = false;
            }
          }
        }

        if (!hasPaid) {
          blog.premium_locked = true;
          blog.premium_locked_reason = sess.member_logged_in ? 'payment' : 'login';
          blog.content = '';
          blog.faqs = null;
          blog.author_bio = null;
          blog.author_linkedin = null;
          blog.author_twitter = null;
          blog.author_website = null;
        }
      }

      return res.json(blog);
    }

    // List — never include news items here; they are served via /api/news
    const filterCategory = req.query.category || null;

    let sql = `SELECT b.*, b.view_count,
      (SELECT COUNT(*) FROM comments c_count WHERE c_count.post_id = b.slug AND c_count.status = 'approved') as comment_count,
      ${AUTHOR_FIELDS}
      FROM blogs b
      LEFT JOIN users u ON b.author_id = u.id
      LEFT JOIN contributors c ON u.contributor_id = c.id`;
    const params = [];

    if (req.query.trending === 'true') {
      sql = `SELECT b.*, b.view_count,
        (SELECT COUNT(*) FROM comments c_count WHERE c_count.post_id = b.slug AND c_count.status = 'approved') as comment_count,
        (SELECT COUNT(*) FROM post_views pv WHERE pv.post_id = b.slug AND pv.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as recent_views,
        ${AUTHOR_FIELDS}
        FROM blogs b
        LEFT JOIN users u ON b.author_id = u.id
        LEFT JOIN contributors c ON u.contributor_id = c.id
        WHERE b.status IN ('approved','published') AND b.status != 'draft' AND b.date <= ? AND (b.type IS NULL OR b.type = 'blog')`;
      params.push(nowUtc);
    } else if (isContributor && authorOnly) {
      sql += " WHERE b.author_id = ? AND (b.type IS NULL OR b.type = 'blog')"; params.push(currentUserId);
    } else if (!sess.admin_logged_in || (isContributor && !authorOnly)) {
      sql += " WHERE b.status IN ('approved','published') AND b.status != 'draft' AND b.date <= ? AND (b.type IS NULL OR b.type = 'blog')"; params.push(nowUtc);
    } else {
      sql += " WHERE (b.type IS NULL OR b.type = 'blog')";
    }

    // Optional server-side category filter — avoids fetching all posts for SSR category pages
    if (filterCategory) {
      sql += ' AND (b.category = ? OR b.subCategory = ?)';
      params.push(filterCategory, filterCategory);
    }

    if (req.query.trending === 'true') {
      sql += ' ORDER BY recent_views DESC, b.view_count DESC LIMIT 5';
    } else {
      sql += ' ORDER BY b.created_at DESC';
    }
    const [rows] = await db.execute(sql, params);

    rows.forEach(b => {
      if (!b.author_name) { b.author_name = 'Guest Author'; b.author_image = 'https://placehold.co/100x100?text=Author'; }
      try { b.co_authors = b.co_authors ? JSON.parse(b.co_authors) : []; } catch { b.co_authors = []; }
    });

    return res.json(rows);
  } catch (err) {
    console.error('[GET /posts]', err.message);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/posts  — create or update
router.post('/', requireAuth(), checkPermission('can_manage_blogs'), async (req, res) => {
  const db = req.db;
  const sess = req.session;
  const isAdmin = sess.role === 'admin';
  const currentUserId = sess.admin_id;

  try {
    const data = req.body || {};
    if (data.publish_date && String(data.publish_date).length === 10) data.publish_date += ' 00:00:00';

    let author_id = currentUserId;
    let authorName = isAdmin ? 'Raghu Boddu' : (sess.admin_user || 'Contributor');

    // Admin can override author
    if (isAdmin && data.author_id && parseInt(data.author_id) !== currentUserId) {
      const [aRows] = await db.execute(
        `SELECT COALESCE(c.full_name, u.full_name, u.username) as display_name
         FROM users u LEFT JOIN contributors c ON u.contributor_id = c.id
         WHERE u.id = ? AND u.is_active = 1`,
        [parseInt(data.author_id)]
      );
      if (aRows.length) { author_id = parseInt(data.author_id); authorName = aRows[0].display_name; }
    }

    const { id, title = '', slug: rawSlug, excerpt = '', content = '', date, image = '',
            image_alt = '',
            category = '', tags = '', meta_title = '', meta_description = '', meta_keywords = '',
            faqs = [], cta_title = null, cta_description = null, cta_button_text = null, cta_button_link = null,
            is_members_only = 0, is_premium = 0, send_notification_email = 0, status: requestedStatus, related_blogs,
            schema_type = 'BlogPosting', article_section = null, co_authors = [] } = data;

    const coAuthorsJson = JSON.stringify(Array.isArray(co_authors) ? co_authors : []);

    const secondaryCats = Array.isArray(data.secondary_categories) ? data.secondary_categories : [];
    const secondaryCatsJson = secondaryCats.length ? JSON.stringify(secondaryCats) : null;

    let slug = rawSlug || '';
    if (!slug && title) slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // Ensure slug is unique — append -2, -3, ... until no collision (skip check for current blog on update)
    if (slug) {
      const baseSlug = slug;
      let counter = 1;
      while (true) {
        const [existing] = await db.execute(
          'SELECT id FROM blogs WHERE slug = ? AND id != ?',
          [slug, id || '']
        );
        if (!existing.length) break;
        counter++;
        slug = `${baseSlug}-${counter}`;
      }
    }

    if (!category || category === 'Select Category' || category === 'none') {
      return res.status(400).json({ status: 'error', message: 'Please select a valid blog category' });
    }

    const seoScore = calculateSeoScore(data);
    const faqsJson = JSON.stringify(Array.isArray(faqs) ? faqs : []);
    const relatedBlogsJson = Array.isArray(related_blogs) ? JSON.stringify(related_blogs) : (related_blogs || null);

    const mailService = MailService.getInstance(db);
    const notifier = new NotificationService(mailService);

    if (id) {
      // UPDATE
      const [existing] = await db.execute(
        'SELECT author_id, author, submission_status, status, plagiarism_score, publish_date, slug FROM blogs WHERE id = ?',
        [id]
      );
      if (!existing.length) return res.status(404).json({ status: 'error', message: 'Blog not found' });
      const ex = existing[0];

      if (!isAdmin && ex.author_id != currentUserId) {
        return res.status(403).json({ status: 'error', message: 'Unauthorized' });
      }

      // Keep existing author unless admin re-assigns
      if (!isAdmin || !data.author_id) { author_id = ex.author_id; authorName = ex.author; }

      // Cascade slug change
      if (ex.slug && slug && ex.slug !== slug) {
        await db.execute('UPDATE comments SET post_id = ? WHERE post_id = ?', [slug, ex.slug]);
        await db.execute('UPDATE post_views SET post_id = ? WHERE post_id = ?', [slug, ex.slug]).catch(() => {});
      }

      const existingPlag = ex.plagiarism_score || 0;

      // Edit preservation for approved/published by contributors
      if (['approved','published'].includes(ex.status) && !isAdmin) {
        const plagRes = await checkPlagiarismScore(content, id, db);
        const finalPlag = plagRes.score === -1 ? existingPlag : plagRes.score;
        await db.execute(
          `UPDATE blogs SET draft_title=?, draft_excerpt=?, draft_content=?,
           draft_meta_title=?, draft_meta_description=?, draft_meta_keywords=?,
           draft_image=?, draft_image_alt=?, draft_category=?, draft_faqs=?, draft_secondary_categories=?,
           draft_cta_title=?, draft_cta_description=?, draft_cta_button_text=?, draft_cta_button_link=?,
           seo_score=?, plagiarism_score=?, submission_status='edited', updated_at=CURRENT_TIMESTAMP
           WHERE id=?`,
          [title, excerpt, content, meta_title, meta_description, meta_keywords, image, image_alt || null, category, faqsJson, secondaryCatsJson,
           cta_title, cta_description, cta_button_text, cta_button_link, seoScore, finalPlag, id]
        );
        cache.invalidate('homepage_data_public');
        notifier.notifyBlogSubmitted(title + ' (Update)', authorName).catch(() => {});
        let msg = 'Changes saved for review. Live version remains unchanged.';
        if (plagRes.score === -1) msg += ' (Warning: Plagiarism check failed)';
        return res.json({ status: 'success', message: msg, plagiarism_score: finalPlag });
      }

      // Standard update
      const targetStatus = isAdmin ? (requestedStatus || 'approved') : 'draft';
      const subStatus = isAdmin ? targetStatus : 'submitted';
      const plagRes = await checkPlagiarismScore(content, id, db);
      const finalPlag = plagRes.score === -1 ? existingPlag : plagRes.score;

      let publishDateSql = '';
      const publishParams = [];
      if (['approved','published'].includes(targetStatus) && !ex.publish_date) {
        publishDateSql = 'publish_date = CURRENT_TIMESTAMP, date = COALESCE(NULLIF(?, ""), CURRENT_DATE),';
        publishParams.push(date || '');
      }

      await db.execute(
        `UPDATE blogs SET
         title=?, slug=?, excerpt=?, content=?, date=COALESCE(NULLIF(?,""),CURRENT_DATE), image=?, image_alt=?, category=?, tags=?, faqs=?,
         secondary_categories=?,
         cta_title=?, cta_description=?, cta_button_text=?, cta_button_link=?,
         meta_title=?, meta_description=?, meta_keywords=?,
         schema_type=?, article_section=?,
         status=?, submission_status=?, rejection_feedback=NULL,
         author_id=?, author=?, seo_score=?, plagiarism_score=?, plagiarism_status='completed',
         is_members_only=?, is_premium=?, related_blogs=?, co_authors=?, send_notification_email=?, updated_at=CURRENT_TIMESTAMP,
         ${publishDateSql}
         draft_title=NULL, draft_content=NULL, draft_excerpt=NULL, draft_image=NULL, draft_image_alt=NULL,
         draft_category=NULL, draft_faqs=NULL, draft_meta_title=NULL, draft_meta_description=NULL,
         draft_meta_keywords=NULL, draft_cta_title=NULL, draft_cta_description=NULL,
         draft_cta_button_text=NULL, draft_cta_button_link=NULL, draft_secondary_categories=NULL
         WHERE id=?`,
        [title, slug, excerpt, content, date || '', image, image_alt || null, category, tags, faqsJson,
         secondaryCatsJson,
         cta_title, cta_description, cta_button_text, cta_button_link,
         meta_title, meta_description, meta_keywords,
         schema_type || 'BlogPosting', article_section || null,
         targetStatus, subStatus, author_id, authorName, seoScore, finalPlag,
         parseInt(is_members_only), parseInt(is_premium), relatedBlogsJson, coAuthorsJson, parseInt(send_notification_email),
         ...publishParams, id]
      );
      cache.invalidate('homepage_data_public');

      if (['approved','published'].includes(targetStatus) && send_notification_email) {
        mailService.queuePendingBlogNotifications().catch(() => {});
      }

      let msg = 'Blog updated';
      if (plagRes.score === -1) msg += ' (Warning: Plagiarism check failed)';
      return res.json({ status: 'success', message: msg, plagiarism_score: finalPlag });

    } else {
      // INSERT
      const newId = data.id || `blog_${Date.now()}`;
      const targetStatus = isAdmin ? (requestedStatus || 'approved') : 'draft';
      const subStatus = isAdmin ? targetStatus : 'submitted';
      const publishDateVal = ['approved','published'].includes(targetStatus)
        ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null;

      const plagRes = await checkPlagiarismScore(content, newId, db);
      const finalPlag = plagRes.score === -1 ? 0 : plagRes.score;

      await db.execute(
        `INSERT INTO blogs
         (id, title, slug, excerpt, content, author, author_id, date, image, image_alt, category, secondary_categories, tags, faqs,
          cta_title, cta_description, cta_button_text, cta_button_link,
          meta_title, meta_description, meta_keywords, schema_type, article_section,
          status, submission_status,
          seo_score, plagiarism_score, plagiarism_status, is_members_only, is_premium, related_blogs, co_authors,
          send_notification_email, publish_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(NULLIF(?,""),CURRENT_DATE), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                 ?, ?,
                 ?, ?, ?, ?, 'completed', ?, ?, ?, ?,
                 ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [newId, title, slug, excerpt, content, authorName, author_id, date || '', image, image_alt || null, category, secondaryCatsJson, tags, faqsJson,
         cta_title, cta_description, cta_button_text, cta_button_link,
         meta_title, meta_description, meta_keywords,
         schema_type || 'BlogPosting', article_section || null,
         targetStatus, subStatus,
         seoScore, finalPlag, parseInt(is_members_only), parseInt(is_premium), relatedBlogsJson, coAuthorsJson,
         parseInt(send_notification_email), publishDateVal]
      );
      cache.invalidate('homepage_data_public');

      if (!isAdmin) notifier.notifyBlogSubmitted(title, authorName).catch(() => {});
      if (['approved','published'].includes(targetStatus) && send_notification_email) {
        mailService.queuePendingBlogNotifications().catch(() => {});
      }

      let msg = 'Blog created';
      if (plagRes.score === -1) msg += ' (Warning: Plagiarism check failed)';
      return res.json({ status: 'success', message: msg, plagiarism_score: finalPlag });
    }
  } catch (err) {
    console.error('[POST /posts]', err.message);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// DELETE /api/posts/:id
router.delete('/:id', requireAuth(), async (req, res) => {
  const db = req.db;
  const sess = req.session;
  const id = req.params.id;

  try {
    const [rows] = await db.execute('SELECT author_id, image FROM blogs WHERE id = ? OR slug = ?', [id, id]);
    if (!rows.length) return res.status(404).json({ status: 'error', message: 'Blog not found' });
    const blog = rows[0];

    if (sess.role !== 'admin' && blog.author_id != sess.admin_id) {
      return res.status(403).json({ status: 'error', message: 'Unauthorized' });
    }

    if (blog.image) deleteImage(blog.image);
    await db.execute('DELETE FROM blogs WHERE id = ? OR slug = ?', [id, id]);
    new CacheService().invalidate('homepage_data_public');

    return res.json({ status: 'success', message: 'Blog deleted' });
  } catch (err) {
    console.error('[DELETE /posts]', err.message);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
