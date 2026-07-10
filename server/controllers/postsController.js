const { asyncHandler } = require('../utils/asyncHandler');
const { sendError } = require('../utils/apiResponse');
const { calculateSeoScore, checkPlagiarismScore, deleteImage } = require('../utils/helpers');
const { sanitizeBlogHtml } = require('../utils/sanitize');
const NotificationService = require('../services/NotificationService');
const MailService = require('../services/MailService');
const CacheService = require('../services/CacheService');
const repo = require('../repositories/postsRepository');

const cache = new CacheService(1800);

// Internal-only DB columns (draft/pending-edit fields, moderation/plagiarism
// data, review metadata) that must never reach a public API response — the
// query selects `b.*` for convenience, which otherwise serializes every raw
// column (including "draft_content": null on almost every post, since that
// field only holds a value while a contributor edit is pending review).
const INTERNAL_ONLY_FIELDS = [
  'draft_title', 'draft_excerpt', 'draft_content', 'draft_meta_title', 'draft_meta_description',
  'draft_meta_keywords', 'draft_cta_title', 'draft_cta_description', 'draft_cta_button_text',
  'draft_cta_button_link', 'draft_image', 'draft_image_alt', 'draft_category', 'draft_subCategory',
  'draft_tags', 'draft_faqs', 'draft_related_blogs', 'draft_is_members_only', 'draft_secondary_categories',
  'submission_status', 'rejection_feedback', 'plagiarism_score', 'plagiarism_status', 'plagiarism_checked_at',
  'reviewed_at', 'reviewed_by', 'seo_score', 'author_id', 'author_user_id', 'is_queued_for_members',
  'homepage_featured_image', 'homepage_featured_order',
];

function stripInternalFields(blog) {
  for (const key of INTERNAL_ONLY_FIELDS) delete blog[key];
  return blog;
}

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

// GET /api/posts/exclusive-count — number of exclusive+premium articles
// Deliberately swallows DB errors and returns zeroed counts (never a 500).
const exclusiveCount = asyncHandler(async (req, res) => {
  const db = req.db;
  try {
    const row = await repo.getExclusivePremiumCounts(db);
    res.json({ exclusive_count: row.exclusive_count || 0, premium_count: row.premium_count || 0 });
  } catch {
    res.json({ exclusive_count: 0, premium_count: 0 });
  }
});

// GET /api/posts/:slug/suggested — up to 6 related articles by category + tags
// Deliberately swallows DB errors and returns [] (never a 500).
const suggested = asyncHandler(async (req, res) => {
  const db = req.db;
  const { slug } = req.params;
  try {
    const current = await repo.findSuggestedCurrent(db, slug);
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

    // Step 1 — same category (up to 12 candidates)
    const sameCat = await repo.findSameCategoryCandidates(db, { nowUtc, currentId: current.id, category: current.category });

    const scored = sameCat.map(r => ({ ...r, _score: scoreRow(r) + 2 })); // +2 same-cat bonus
    scored.sort((a, b) => b._score - a._score || b.view_count - a.view_count);
    const picked = scored.slice(0, 6);

    // Step 2 — keyword-matched cross-category (fill up to 6)
    if (picked.length < 6) {
      const usedIds = new Set([current.id, ...picked.map(r => r.id)]);
      const crossCat = await repo.findCrossCategoryCandidates(db, { nowUtc, currentId: current.id, category: current.category });
      const crossScored = crossCat
        .filter(r => !usedIds.has(r.id))
        .map(r => ({ ...r, _score: scoreRow(r) }))
        .sort((a, b) => b._score - a._score || b.view_count - a.view_count);
      picked.push(...crossScored.slice(0, 6 - picked.length));
    }

    // Step 3 — hard fallback: most popular approved articles regardless of keyword match
    if (picked.length < 6) {
      const usedIds = new Set([current.id, ...picked.map(r => r.id)]);
      const popular = await repo.findPopularFallback(db, current.id);
      popular.filter(r => !usedIds.has(r.id)).slice(0, 6 - picked.length).forEach(r => picked.push(r));
    }

    res.json(picked.slice(0, 6).map(({ _score, tags: _t, ...r }) => r));
  } catch (err) {
    console.error('[suggested]', err.message);
    res.json([]);
  }
});

// PUT /api/posts/:id/badges — admin-only; update verification badges only
const updateBadges = asyncHandler(async (req, res) => {
  const db = req.db;
  const { id } = req.params;
  const { badge_expert_reviewed = 0, badge_sap_notes_verified = 0, badge_tested_s4hana = 0, badge_field_validated = 0, difficulty_level = null } = req.body;
  const VALID_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert', 'Enterprise'];
  const level = VALID_LEVELS.includes(difficulty_level) ? difficulty_level : null;

  await repo.updateBadges(db, id, { badge_expert_reviewed, badge_sap_notes_verified, badge_tested_s4hana, badge_field_validated, level });
  res.json({ status: 'success' });
});

// GET /api/posts  or  GET /api/posts/:idOrSlug
const list = asyncHandler(async (req, res) => {
  const db = req.db;
  const sess = req.session;
  const isAdmin = sess.admin_logged_in && sess.role === 'admin';
  const isContributor = sess.admin_logged_in && sess.role === 'contributor';
  const currentUserId = sess.admin_id || null;
  const nowUtc = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const authorOnly = req.query.author_only == '1';

  const idOrSlug = req.params.idOrSlug || null;

  if (idOrSlug) {
    // Single blog
    const blog = await repo.findSingleBySlugOrId(db, idOrSlug, { isContributor, authorOnly, currentUserId, isAdmin });
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
        hasUnlocked = await repo.hasUnlockedBlog(db, sess.member_id, blog.slug);
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

    // Strip internal-only columns for anyone who isn't staff — admins and
    // contributors viewing their own post still need draft/review fields.
    if (!hasAdminAccess) stripInternalFields(blog);

    return res.json(blog);
  }

  // List — never include news items here; they are served via /api/news
  const filterCategory = req.query.category || null;
  const trending = req.query.trending === 'true';

  const rows = await repo.findList(db, {
    isContributor, authorOnly, currentUserId,
    isAdminLoggedIn: !!sess.admin_logged_in, trending, filterCategory, nowUtc,
  });

  // Same content-gating the single-post endpoint applies — the list query
  // selects full `content` for every row, so without this, premium/members-only
  // article bodies are fully readable via GET /api/posts by anyone (a paywall
  // bypass), independent of whatever lock state the single-post page shows.
  const isMember = !!sess.member_logged_in;
  const hasGrantedAccess = !!(sess.permissions?.can_access_premium_articles);
  let unlockedSlugs = new Set();
  if (isMember && sess.member_id && rows.some(b => Number(b.is_premium) === 1)) {
    unlockedSlugs = new Set(await repo.findUnlockedSlugsForMember(db, sess.member_id));
  }

  rows.forEach(b => {
    if (!b.author_name) { b.author_name = 'Guest Author'; b.author_image = 'https://placehold.co/100x100?text=Author'; }
    try { b.co_authors = b.co_authors ? JSON.parse(b.co_authors) : []; } catch { b.co_authors = []; }
    try { b.secondary_categories = b.secondary_categories ? JSON.parse(b.secondary_categories) : []; } catch { b.secondary_categories = []; }

    const isOwnBlog = isContributor && currentUserId && String(b.author_id) === String(currentUserId);
    const hasAdminAccess = isAdmin || isOwnBlog;

    if (Number(b.is_members_only) === 1 && !isMember && !hasAdminAccess) {
      const paras = (b.content || '').match(/<p[\s\S]*?<\/p>/gi) || [];
      b.content = paras[0] || (b.content || '').slice(0, 300);
      b.faqs = null;
    }
    if (Number(b.is_premium) === 1 && !hasGrantedAccess && !hasAdminAccess && !unlockedSlugs.has(b.slug)) {
      b.premium_locked = true;
      const paras = (b.content || '').match(/<p[\s\S]*?<\/p>/gi) || [];
      b.content = paras[0] || (b.content || '').slice(0, 300);
      b.faqs = null;
    }

    if (!isAdmin && !isContributor) stripInternalFields(b);
  });

  return res.json(rows);
});

// POST /api/posts  — create or update
const save = asyncHandler(async (req, res) => {
  const db = req.db;
  const sess = req.session;
  const isAdmin = sess.role === 'admin';
  const currentUserId = sess.admin_id;

  const data = req.body || {};
  if (data.publish_date && String(data.publish_date).length === 10) data.publish_date += ' 00:00:00';

  let author_id = currentUserId;
  let authorName = isAdmin ? 'Raghu Boddu' : (sess.admin_user || 'Contributor');

  // Admin can override author
  if (isAdmin && data.author_id && parseInt(data.author_id) !== currentUserId) {
    const aRow = await repo.findAuthorDisplayName(db, parseInt(data.author_id));
    if (aRow) { author_id = parseInt(data.author_id); authorName = aRow.display_name; }
  }

  const { id, title = '', slug: rawSlug, excerpt = '', content: rawContent = '', date, image = '',
          image_alt = '',
          category = '', tags = '', meta_title = '', meta_description = '', meta_keywords = '',
          faqs = [], cta_title = null, cta_description = null, cta_button_text = null, cta_button_link = null,
          is_members_only: rawIsMembersOnly = 0, is_premium = 0, credits_required = 1, send_notification_email = 0, status: requestedStatus, related_blogs,
          schema_type = 'BlogPosting', article_section = null, co_authors = [],
          badge_expert_reviewed = 0, badge_sap_notes_verified = 0, badge_tested_s4hana = 0, badge_field_validated = 0,
          difficulty_level: rawDifficultyLevel = null } = data;
  const VALID_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert', 'Enterprise'];
  const difficulty_level = VALID_LEVELS.includes(rawDifficultyLevel) ? rawDifficultyLevel : null;
  const content = sanitizeBlogHtml(rawContent);
  // Premium and Exclusive are mutually exclusive content tiers — Premium wins
  // if both were somehow submitted together (mirrors the same rule enforced
  // in the quick-toggle endpoints).
  const is_members_only = is_premium ? 0 : rawIsMembersOnly;

  const coAuthorsJson = JSON.stringify(Array.isArray(co_authors) ? co_authors : []);

  const secondaryCats = Array.isArray(data.secondary_categories) ? data.secondary_categories : [];
  const secondaryCatsJson = secondaryCats.length ? JSON.stringify(secondaryCats) : null;

  let slug = rawSlug || '';
  if (!slug && title) slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // Ensure slug is unique — append -2, -3, ... until no collision (skip check for current blog on update)
  if (slug) {
    const baseSlug = slug;
    let counter = 1;
    while (await repo.slugExists(db, slug, id)) {
      counter++;
      slug = `${baseSlug}-${counter}`;
    }
  }

  if (!category || category === 'Select Category' || category === 'none') {
    return sendError(res, 'Please select a valid blog category', 400);
  }

  const seoScore = calculateSeoScore(data);
  const faqsJson = JSON.stringify(Array.isArray(faqs) ? faqs : []);
  const relatedBlogsJson = Array.isArray(related_blogs) ? JSON.stringify(related_blogs) : (related_blogs || null);

  const mailService = MailService.getInstance(db);
  const notifier = new NotificationService(mailService);

  if (id) {
    // UPDATE
    const ex = await repo.findExistingForUpdate(db, id);
    if (!ex) return res.status(404).json({ status: 'error', message: 'Blog not found' });

    if (!isAdmin && ex.author_id != currentUserId) {
      return res.status(403).json({ status: 'error', message: 'Unauthorized' });
    }

    // Keep existing author unless admin re-assigns
    if (!isAdmin || !data.author_id) { author_id = ex.author_id; authorName = ex.author; }

    // Cascade slug change
    if (ex.slug && slug && ex.slug !== slug) {
      await repo.cascadeSlugChange(db, ex.slug, slug);
      // post_views stores blog ID (not slug) — ID never changes, no cascade needed
    }

    const existingPlag = ex.plagiarism_score || 0;
    const newContentVersion = bumpBlogVersion(ex.content_version, ex.content, content);

    // Edit preservation for approved/published by contributors
    if (['approved','published'].includes(ex.status) && !isAdmin) {
      const plagRes = await checkPlagiarismScore(content, id, db);
      const finalPlag = plagRes.score === -1 ? existingPlag : plagRes.score;
      await repo.saveEditForReview(db, id, {
        title, excerpt, content, meta_title, meta_description, meta_keywords, image, image_alt, category, faqsJson, secondaryCatsJson,
        cta_title, cta_description, cta_button_text, cta_button_link, seoScore, finalPlag,
      });
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

    const setPublishDate = ['approved','published'].includes(targetStatus) && !ex.publish_date;

    await repo.updateBlogStandard(db, id, {
      title, slug, excerpt, content, date, image, image_alt, category, tags, faqsJson, secondaryCatsJson,
      cta_title, cta_description, cta_button_text, cta_button_link,
      meta_title, meta_description, meta_keywords, schema_type, article_section,
      targetStatus, subStatus, author_id, authorName, seoScore, finalPlag,
      is_members_only, is_premium, credits_required, relatedBlogsJson, coAuthorsJson, send_notification_email,
      badge_expert_reviewed, badge_sap_notes_verified, badge_tested_s4hana, badge_field_validated, difficulty_level, newContentVersion,
      setPublishDate,
    });
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

    await repo.insertBlog(db, {
      newId, title, slug, excerpt, content, authorName, author_id, date, image, image_alt, category, secondaryCatsJson, tags, faqsJson,
      cta_title, cta_description, cta_button_text, cta_button_link,
      meta_title, meta_description, meta_keywords, schema_type, article_section,
      targetStatus, subStatus,
      seoScore, finalPlag, is_members_only, is_premium, credits_required, relatedBlogsJson, coAuthorsJson,
      send_notification_email,
      badge_expert_reviewed, badge_sap_notes_verified, badge_tested_s4hana, badge_field_validated, difficulty_level,
      publishDateVal,
    });
    cache.invalidate('homepage_data_public');

    if (!isAdmin) notifier.notifyBlogSubmitted(title, authorName).catch(() => {});
    if (['approved','published'].includes(targetStatus) && send_notification_email) {
      mailService.queuePendingBlogNotifications().catch(() => {});
    }

    let msg = 'Blog created';
    if (plagRes.score === -1) msg += ' (Warning: Plagiarism check failed)';
    return res.json({ status: 'success', message: msg, plagiarism_score: finalPlag });
  }
});

// DELETE /api/posts/:id
const remove = asyncHandler(async (req, res) => {
  const db = req.db;
  const sess = req.session;
  const id = req.params.id;

  const blog = await repo.findForDelete(db, id);
  if (!blog) return res.status(404).json({ status: 'error', message: 'Blog not found' });

  if (sess.role !== 'admin' && blog.author_id != sess.admin_id) {
    return res.status(403).json({ status: 'error', message: 'Unauthorized' });
  }

  if (blog.image) deleteImage(blog.image);
  await repo.deleteBlogById(db, id);
  new CacheService().invalidate('homepage_data_public');

  return res.json({ status: 'success', message: 'Blog deleted' });
});

module.exports = { exclusiveCount, suggested, updateBadges, list, save, remove };
