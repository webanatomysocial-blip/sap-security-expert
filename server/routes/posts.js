const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const { calculateSeoScore, checkPlagiarismScore, deleteImage } = require('../utils/helpers');
const NotificationService = require('../services/NotificationService');
const MailService = require('../services/MailService');
const CacheService = require('../services/CacheService');

const cache = new CacheService(1800);

// ── Blog content version auto-bumper ─────────────────────────────────────────
function bumpBlogVersion(currentVersion, oldContent, newContent) {
  const parts = (currentVersion || '1.0').split('.').map(Number);
  let major = parts[0] || 1;
  let minor = parts[1] || 0;

  if (!oldContent || !newContent) return `${major}.${minor}`;
  const oldLen = oldContent.length;
  if (oldLen === 0) return `${major}.${minor}`;

  const diff = Math.abs(newContent.length - oldLen);
  const pct = diff / oldLen;

  if (pct >= 0.5) {
    // 50%+ change — major bump (e.g. 1.3 → 2.0)
    return `${major + 1}.0`;
  } else if (pct >= 0.1) {
    // 10–49% change — minor bump (e.g. 1.0 → 1.1)
    return `${major}.${minor + 1}`;
  }
  return `${major}.${minor}`; // < 10% — no change
}

// Author info SELECT fragment (reused in GET queries)
const AUTHOR_FIELDS = `
  u.id as author_user_id, u.username as author_username, u.role as author_role,
  CASE
    WHEN b.author_id IS NULL OR b.author_id = 1 THEN 'Raghu Boddu'
    ELSE COALESCE(c.full_name, u.full_name, u.username, b.author)
  END as author_name,
  CASE
    WHEN b.author_id IS NULL OR b.author_id = 1 THEN '/assets/raghu_boddu.png'
    ELSE COALESCE(c.image, u.profile_image)
  END as author_image,
  COALESCE(c.short_bio, u.bio) as author_bio,
  COALESCE(c.designation, u.designation) as author_designation,
  COALESCE(c.linkedin, u.linkedin) as author_linkedin,
  COALESCE(c.twitter_handle, u.twitter_handle) as author_twitter,
  COALESCE(c.personal_website, u.personal_website) as author_website,
  CASE
    WHEN b.author_id IS NULL OR b.author_id = 1 THEN 'raghu'
    ELSE CAST(c.id AS CHAR)
  END as author_contributor_id
`;

// GET /api/posts/exclusive-count — number of exclusive+premium articles
router.get('/exclusive-count', async (req, res) => {
  const db = req.db;
  try {
    const [rows] = await db.execute(
      `SELECT
        COUNT(CASE WHEN is_members_only = 1 THEN 1 END) AS exclusive_count,
        COUNT(CASE WHEN is_premium = 1 THEN 1 END)      AS premium_count
       FROM blogs
       WHERE status IN ('approved','published')`
    );
    const row = rows[0] || {};
    res.json({ exclusive_count: row.exclusive_count || 0, premium_count: row.premium_count || 0 });
  } catch {
    res.json({ exclusive_count: 0, premium_count: 0 });
  }
});

// GET /api/posts/:slug/suggested — up to 6 related articles by category + tags
router.get('/:slug/suggested', async (req, res) => {
  const db = req.db;
  const { slug } = req.params;
  try {
    // Find current article — no status filter so it works for admins previewing drafts too
    const [[current]] = await db.execute(
      `SELECT id, category, tags, title FROM blogs WHERE slug = ? LIMIT 1`,
      [slug]
    );
    if (!current) return res.json([]);

    const nowUtc = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Build keyword set from tags + significant title words
    const STOP_WORDS = new Set(['sap','the','and','for','with','how','what','why','when','from','that','this','into','your','our','its','are','was','has','have','can','will','you','all','but','not','more','about','which','their','been','each','only','also','than','then','them']);
    let currentTags = [];
    try { currentTags = JSON.parse(current.tags || '[]').map(t => t.toLowerCase()); } catch {}
    const titleWords = (current.title || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3 && !STOP_WORDS.has(w));
    const keywords = [...new Set([...currentTags, ...titleWords])];

    const scoreRow = (r) => {
      let s = 0;
      // Tag overlap
      try { s += JSON.parse(r.tags || '[]').map(t => t.toLowerCase()).filter(t => keywords.includes(t)).length * 2; } catch {}
      // Title keyword overlap
      const rWords = (r.title || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3 && !STOP_WORDS.has(w));
      s += rWords.filter(w => keywords.includes(w)).length;
      return s;
    };

    const COLS = 'id, title, slug, category, image, image_alt, excerpt, date, view_count, tags';

    // Step 1 — same category (up to 12 candidates)
    const [sameCat] = await db.execute(
      `SELECT ${COLS} FROM blogs
       WHERE status IN ('approved','published') AND date <= ? AND id != ? AND category = ?
       ORDER BY view_count DESC, date DESC LIMIT 12`,
      [nowUtc, current.id, current.category]
    );

    const scored = sameCat.map(r => ({ ...r, _score: scoreRow(r) + 2 })); // +2 same-cat bonus
    scored.sort((a, b) => b._score - a._score || b.view_count - a.view_count);
    const picked = scored.slice(0, 6);

    // Step 2 — keyword-matched cross-category (fill up to 6)
    if (picked.length < 6) {
      const usedIds = new Set([current.id, ...picked.map(r => r.id)]);
      const [crossCat] = await db.execute(
        `SELECT ${COLS} FROM blogs
         WHERE status IN ('approved','published') AND date <= ? AND id != ? AND category != ?
         ORDER BY view_count DESC, date DESC LIMIT 50`,
        [nowUtc, current.id, current.category]
      );
      const crossScored = crossCat
        .filter(r => !usedIds.has(r.id))
        .map(r => ({ ...r, _score: scoreRow(r) }))
        .sort((a, b) => b._score - a._score || b.view_count - a.view_count);
      picked.push(...crossScored.slice(0, 6 - picked.length));
    }

    // Step 3 — hard fallback: most popular approved articles regardless of keyword match
    if (picked.length < 6) {
      const usedIds = new Set([current.id, ...picked.map(r => r.id)]);
      const [popular] = await db.execute(
        `SELECT ${COLS} FROM blogs
         WHERE status IN ('approved','published') AND id != ?
         ORDER BY view_count DESC, date DESC LIMIT 20`,
        [current.id]
      );
      popular.filter(r => !usedIds.has(r.id)).slice(0, 6 - picked.length).forEach(r => picked.push(r));
    }

    res.json(picked.slice(0, 6).map(({ _score, tags: _t, ...r }) => r));
  } catch (err) {
    console.error('[suggested]', err.message);
    res.json([]);
  }
});

// PUT /api/posts/:id/badges — admin-only; update verification badges only
router.put('/:id/badges', requireAuth(), async (req, res) => {
  const db = req.db;
  const { id } = req.params;
  const { badge_expert_reviewed = 0, badge_sap_notes_verified = 0, badge_tested_s4hana = 0, badge_field_validated = 0, difficulty_level = null } = req.body;
  const VALID_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert', 'Enterprise'];
  const level = VALID_LEVELS.includes(difficulty_level) ? difficulty_level : null;
  try {
    await db.execute(
      `UPDATE blogs SET badge_expert_reviewed=?, badge_sap_notes_verified=?, badge_tested_s4hana=?, badge_field_validated=?, difficulty_level=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      [badge_expert_reviewed ? 1 : 0, badge_sap_notes_verified ? 1 : 0, badge_tested_s4hana ? 1 : 0, badge_field_validated ? 1 : 0, level, id]
    );
    res.json({ status: 'success' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

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
        // Send only the first paragraph as teaser for non-members
        const fullMembersContent = blog.content || '';
        const membersParagraphs = fullMembersContent.match(/<p[\s\S]*?<\/p>/gi) || [];
        blog.content = membersParagraphs[0] || fullMembersContent.slice(0, 300);
        blog.faqs = null;
        blog.cta_title = 'Professional Content Locked';
        blog.cta_description = 'Join our expert community to access premium SAP security insights.';
        blog.cta_button_text = 'Join Members Area';
        blog.cta_button_link = '/member/signup';
        blog.author = 'SAP Security Expert';
        blog.author_name = 'SAP Security Expert';
        ['author_bio','author_image','author_designation','author_linkedin','author_twitter','author_website'].forEach(k => { blog[k] = null; });
      }

      // Premium credit gate — content only sent to members who have unlocked this article.
      // Bypassed only for contributors/admins explicitly granted can_access_premium_articles.
      // Admin role alone does NOT bypass — admins browsing the public site see the same paywall.
      const isPremium = parseInt(blog.is_premium || 0);
      const creditsRequired = parseInt(blog.credits_required || 0);
      // Only grant access via explicit permission flag — NOT by admin role alone
      const hasGrantedAccess = !!(sess.permissions?.can_access_premium_articles);
      if (isPremium && !hasGrantedAccess) {
        let hasUnlocked = false;
        if (sess.member_logged_in && sess.member_id) {
          const [unlockRows] = await db.execute(
            'SELECT id FROM member_blog_unlocks WHERE member_id = ? AND blog_slug = ? LIMIT 1',
            [sess.member_id, blog.slug]
          );
          hasUnlocked = unlockRows.length > 0;
        }

        if (!hasUnlocked) {
          blog.premium_locked = true;
          blog.premium_locked_reason = sess.member_logged_in ? 'credits' : 'login';
          blog.credits_required = creditsRequired;
          // Send ONLY the first paragraph as a teaser — not a fraction of the full article
          const fullContent = blog.content || '';
          const paragraphs = fullContent.match(/<p[\s\S]*?<\/p>/gi) || [];
          blog.content = paragraphs[0] || fullContent.slice(0, 300);
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
        (SELECT COUNT(*) FROM post_views pv WHERE pv.post_id = b.id AND pv.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as recent_views,
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
      try { b.secondary_categories = b.secondary_categories ? JSON.parse(b.secondary_categories) : []; } catch { b.secondary_categories = []; }
    });

    return res.json(rows);
  } catch (err) {
    console.error('[GET /posts]', err.message);
    console.error("[route]", err.message); return res.status(500).json({ status: "error", message: "Internal server error." });
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
            is_members_only = 0, is_premium = 0, credits_required = 1, send_notification_email = 0, status: requestedStatus, related_blogs,
            schema_type = 'BlogPosting', article_section = null, co_authors = [],
            badge_expert_reviewed = 0, badge_sap_notes_verified = 0, badge_tested_s4hana = 0, badge_field_validated = 0,
            difficulty_level: rawDifficultyLevel = null } = data;
    const VALID_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert', 'Enterprise'];
    const difficulty_level = VALID_LEVELS.includes(rawDifficultyLevel) ? rawDifficultyLevel : null;

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
        'SELECT author_id, author, submission_status, status, plagiarism_score, publish_date, slug, content, content_version FROM blogs WHERE id = ?',
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
        // post_views stores blog ID (not slug) — ID never changes, no cascade needed
      }

      const existingPlag = ex.plagiarism_score || 0;
      const newContentVersion = bumpBlogVersion(ex.content_version, ex.content, content);

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
         is_members_only=?, is_premium=?, credits_required=?, related_blogs=?, co_authors=?, send_notification_email=?,
         badge_expert_reviewed=?, badge_sap_notes_verified=?, badge_tested_s4hana=?, badge_field_validated=?, difficulty_level=?, content_version=?,
         updated_at=CURRENT_TIMESTAMP,
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
         parseInt(is_members_only), parseInt(is_premium), parseInt(credits_required) || 1, relatedBlogsJson, coAuthorsJson, parseInt(send_notification_email),
         badge_expert_reviewed ? 1 : 0, badge_sap_notes_verified ? 1 : 0, badge_tested_s4hana ? 1 : 0, badge_field_validated ? 1 : 0, difficulty_level, newContentVersion,
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
          seo_score, plagiarism_score, plagiarism_status, is_members_only, is_premium, credits_required, related_blogs, co_authors,
          send_notification_email, badge_expert_reviewed, badge_sap_notes_verified, badge_tested_s4hana, badge_field_validated, difficulty_level, content_version,
          publish_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(NULLIF(?,""),CURRENT_DATE), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                 ?, ?,
                 ?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?,
                 ?, ?, ?, ?, ?, ?, ?,
                 ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [newId, title, slug, excerpt, content, authorName, author_id, date || '', image, image_alt || null, category, secondaryCatsJson, tags, faqsJson,
         cta_title, cta_description, cta_button_text, cta_button_link,
         meta_title, meta_description, meta_keywords,
         schema_type || 'BlogPosting', article_section || null,
         targetStatus, subStatus,
         seoScore, finalPlag, parseInt(is_members_only), parseInt(is_premium), parseInt(credits_required) || 1, relatedBlogsJson, coAuthorsJson,
         parseInt(send_notification_email),
         badge_expert_reviewed ? 1 : 0, badge_sap_notes_verified ? 1 : 0, badge_tested_s4hana ? 1 : 0, badge_field_validated ? 1 : 0, difficulty_level, '1.0',
         publishDateVal]
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
    console.error("[route]", err.message); return res.status(500).json({ status: "error", message: "Internal server error." });
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
    console.error("[route]", err.message); return res.status(500).json({ status: "error", message: "Internal server error." });
  }
});

module.exports = router;
