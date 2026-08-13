const { asyncHandler } = require('../utils/asyncHandler');
const { sendError } = require('../utils/apiResponse');
const { calculateSeoScore, checkPlagiarismScore, deleteImage, deleteUploadedFile, extractDownloadUrls } = require('../utils/helpers');
const { sanitizeBlogHtml } = require('../utils/sanitize');
const NotificationService = require('../services/NotificationService');
const MailService = require('../services/MailService');
const CacheService = require('../services/CacheService');
const { revalidateBlog } = require('../utils/revalidate');
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

  // Internal SSR bypass: Next.js server components fetch with this header+secret
  // so Googlebot gets full article content for indexing (no paywall truncation).
  // Validated against REVALIDATE_SECRET so only the Next.js server can use it.
  const ssrSecret = process.env.REVALIDATE_SECRET || '';
  const isInternalSSR = !!(ssrSecret && req.headers['x-ssr-internal'] === ssrSecret);
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

    // Enrich co-authors with live data. Co-author IDs are user.id values, so
    // join users → contributors to pick up both contributor profiles and admin users.
    // Admin users (e.g. Raghu Boddu) have no contributor record, so their bio/socials
    // come from a server-side static profile keyed by username.
    const ADMIN_PROFILES = {
      raghu: {
        bio: 'Raghu Boddu is a technology leader and cybersecurity professional with extensive experience in SAP Security, GRC, data protection, and enterprise risk management, and is the author of books on SAP Access Control, SAP Process Control, and SAP Identity Access Governance (IAG).',
        designation: 'SAP Security & GRC Expert | Founder',
        linkedin: 'https://www.linkedin.com/in/bodduraghu/',
        twitter_handle: 'https://x.com/GRCwithRaghu',
        personal_website: 'https://raghuboddu.com/',
      },
    };
    if (blog.co_authors.length > 0) {
      const coIds = blog.co_authors.map(ca => ca.id).filter(Boolean);
      if (coIds.length > 0) {
        const placeholders = coIds.map(() => '?').join(',');
        const [liveRows] = await db.execute(
          `SELECT u.id, u.username, u.role,
             COALESCE(c.full_name, u.full_name, u.username) AS name,
             COALESCE(c.image, u.profile_image) AS image,
             c.short_bio AS bio,
             c.designation AS designation,
             c.linkedin AS linkedin,
             c.twitter_handle AS twitter_handle,
             c.personal_website AS personal_website
           FROM users u
           LEFT JOIN contributors c ON u.contributor_id = c.id
           WHERE u.id IN (${placeholders})`,
          coIds
        );
        const liveMap = {};
        liveRows.forEach(r => { liveMap[r.id] = r; });
        blog.co_authors = blog.co_authors.map(ca => {
          const live = liveMap[ca.id];
          if (!live) return ca;
          // For admin users with no contributor record, fall back to static profile
          const staticFallback = ADMIN_PROFILES[live.username]
            || (live.role === 'admin' ? ADMIN_PROFILES['raghu'] : null);
          return {
            id: ca.id,
            name: live.name || ca.name,
            image: live.image || ca.image,
            bio: live.bio || ca.bio || staticFallback?.bio || '',
            designation: live.designation || ca.designation || staticFallback?.designation || '',
            linkedin: live.linkedin || ca.linkedin || staticFallback?.linkedin || '',
            twitter_handle: live.twitter_handle || ca.twitter_handle || staticFallback?.twitter_handle || '',
            personal_website: live.personal_website || ca.personal_website || staticFallback?.personal_website || '',
          };
        });
      }
    }

    // Exclusivity enforcement (free members gate)
    const isMembersOnly = parseInt(blog.is_members_only || 0);
    const isMember = !!sess.member_logged_in;
    // Contributors bypass the paywall only for their OWN blogs.
    // isInternalSSR bypasses all gates so Googlebot gets full content for indexing.
    // Admin role alone does NOT bypass the paywall — admins see the same gate as regular visitors.
    const isOwnBlog = isContributor && currentUserId && String(blog.author_user_id) === String(currentUserId);
    const hasPaywallBypass = isOwnBlog || isInternalSSR;
    // Admin still needs to see internal draft/review fields in the response.
    const hasAdminAccess = isAdmin || isOwnBlog || isInternalSSR;

    // Resolve how many blocks/lines to expose before the paywall:
    // per-article setting wins; otherwise the site-wide default of 3 (no
    // longer admin-configurable — was a single-purpose settings row that
    // added a DB round-trip for a value that's effectively constant).
    const SITE_DEFAULT_PREVIEW_BLOCKS = 3;
    const effectivePreview = blog.preview_paragraphs != null ? parseInt(blog.preview_paragraphs) : SITE_DEFAULT_PREVIEW_BLOCKS;
    const effectiveUnit = blog.preview_unit || 'blocks';

    // Slice HTML to N block-level elements (counting ALL occurrences, not just
    // top-level, so wrapped content like <div><p>...</p></div> is handled).
    // After finding the Nth block's closing tag, any unclosed ancestor tags
    // are appended so the output is always well-formed HTML.
    //
    // "matching close" helper: finds the close tag that matches the Nth opening
    // of <tag> starting from `fromPos`, handling nested same-type tags.
// Return html sliced to the end of the nth countable block.
    // "Blocks" = p, ul, ol, blockquote, table, figure — headings never count.
    // Empty / whitespace-only blocks are skipped.
    // Uses simple forward scan; for each block opening tag we find the FIRST
    // matching close tag (indexOf). Nested same-tags inside ul/ol may cause a
    // slightly early cut, but that is always safe (never shows too much).
    function truncateHtmlFallback(html, targetLength) {
      if (!html) return '';
      let outputText = '';
      let textCount = 0;
      const openTags = [];
      const voidElements = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

      let i = 0;
      while (i < html.length) {
        if (html[i] === '<') {
          const gt = html.indexOf('>', i);
          if (gt === -1) {
            outputText += html.slice(i);
            break;
          }
          const tagStr = html.slice(i, gt + 1);
          const isClosing = tagStr.startsWith('</');
          const isSelfClosing = tagStr.endsWith('/>');

          const tagNameMatch = tagStr.match(/^<\/?([a-zA-Z0-9:-]+)/);
          const tagName = tagNameMatch ? tagNameMatch[1].toLowerCase() : '';

          if (tagName) {
            if (isClosing) {
              const index = openTags.lastIndexOf(tagName);
              if (index !== -1) {
                openTags.splice(index);
              }
            } else if (!isSelfClosing && !voidElements.has(tagName)) {
              openTags.push(tagName);
            }
          }

          outputText += tagStr;
          i = gt + 1;
        } else if (html[i] === '&') {
          const semi = html.indexOf(';', i);
          if (semi !== -1 && semi - i < 10) {
            outputText += html.slice(i, semi + 1);
            textCount++;
            i = semi + 1;
          } else {
            outputText += html[i];
            textCount++;
            i++;
          }
        } else {
          outputText += html[i];
          textCount++;
          i++;
        }

        if (textCount >= targetLength) {
          outputText += '...';
          for (let j = openTags.length - 1; j >= 0; j--) {
            outputText += `</${openTags[j]}>`;
          }
          return outputText;
        }
      }
      return html;
    }

    function sliceToBlocks(html, n) {
      if (!html || !n || n <= 0) return '';
      const lo = html.toLowerCase();
      const TAGS = ['blockquote', 'figure', 'table', 'ul', 'ol', 'p']; // longest first avoids prefix collisions
      let count = 0;
      let pos = 0;
      let firstBlockEnd = -1;

      while (pos < lo.length) {
        // Find the next opening tag that belongs to our countable set
        let earliest = -1, earliestTag = '', earliestEnd = -1;
        for (const t of TAGS) {
          // Must be <tag> or <tag ...> — not a closing tag, not a prefix of another tag
          let search = pos;
          while (search < lo.length) {
            const idx = lo.indexOf(`<${t}`, search);
            if (idx === -1) break;
            const after = idx + t.length + 1; // char after tag name
            const ch = lo[after];
            if (ch === '>' || ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r') {
              // Find end of opening tag
              const gt = lo.indexOf('>', idx);
              if (gt === -1) { search = idx + 1; continue; }
              if (lo[gt - 1] === '/') { search = gt + 1; continue; } // self-closing
              if (earliest === -1 || idx < earliest) {
                earliest = idx;
                earliestTag = t;
                earliestEnd = gt + 1; // position right after the opening >
              }
              break;
            }
            search = idx + 1;
          }
        }

        if (earliest === -1) break; // no more countable blocks

        const tag = earliestTag;
        const afterOpen = earliestEnd;
        const closeTag = `</${tag}>`;

        // Find the first </tag> after afterOpen — this handles the common case
        // (p tags are never nested; ul/ol may be, but we accept a slightly early cut)
        const closeIdx = lo.indexOf(closeTag, afterOpen);
        if (closeIdx === -1) {
          pos = afterOpen; // no close tag found, skip past open and keep going
          continue;
        }

        const closeEnd = closeIdx + closeTag.length;
        const inner = html.slice(afterOpen, closeIdx);

        pos = closeEnd; // advance for next iteration

        if (!inner.replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, '').trim()) continue; // skip empty

        count++;
        if (count === 1) {
          firstBlockEnd = closeEnd;
        }
        if (count === n) return html.slice(0, closeEnd);
      }

      if (count === 0) {
        return truncateHtmlFallback(html, n * 400);
      }
      // If the total count of blocks is less than or equal to n,
      // we force truncate to 1 block so the paywall is not at the very bottom.
      if (firstBlockEnd !== -1) {
        return html.slice(0, firstBlockEnd);
      }
      return html;
    }

    // "Lines" mode: counts approx. text lines (~80 chars each) across all countable elements.
    // Handles multi-line paragraphs by truncating the block content.
    function sliceToLines(html, n) {
      if (!html || !n || n <= 0) return '';
      const lo = html.toLowerCase();
      const TAGS = ['blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'p'];
      let count = 0;
      let pos = 0;
      let firstLineContent = null;

      while (pos < lo.length) {
        let earliest = -1, earliestTag = '', earliestEnd = -1;
        for (const t of TAGS) {
          let search = pos;
          while (search < lo.length) {
            const idx = lo.indexOf(`<${t}`, search);
            if (idx === -1) break;
            const after = idx + t.length + 1;
            const ch = lo[after];
            if (ch === '>' || ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r') {
              const gt = lo.indexOf('>', idx);
              if (gt === -1) { search = idx + 1; continue; }
              if (lo[gt - 1] === '/') { search = gt + 1; continue; }
              if (earliest === -1 || idx < earliest) {
                earliest = idx;
                earliestTag = t;
                earliestEnd = gt + 1;
              }
              break;
            }
            search = idx + 1;
          }
        }

        if (earliest === -1) break;

        const tag = earliestTag;
        const afterOpen = earliestEnd;
        const closeTag = `</${tag}>`;
        const closeIdx = lo.indexOf(closeTag, afterOpen);
        if (closeIdx === -1) { pos = afterOpen; continue; }

        const closeEnd = closeIdx + closeTag.length;
        const inner = html.slice(afterOpen, closeIdx);

        pos = closeEnd;

        const plainText = inner.replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').trim();
        if (!plainText) continue;

        const linesInBlock = Math.ceil(plainText.length / 80);

        // Save the first line slice for fallback
        if (count === 0 && !firstLineContent) {
          if (plainText.length > 80) {
            firstLineContent = html.slice(0, afterOpen) + plainText.slice(0, 80) + '...' + closeTag;
          } else {
            firstLineContent = html.slice(0, closeEnd);
          }
        }

        if (count + linesInBlock <= n) {
          count += linesInBlock;
          if (count === n) return html.slice(0, closeEnd);
        } else {
          // Must truncate this block
          const charsToKeep = (n - count) * 80;
          if (plainText.length > charsToKeep) {
            const truncatedText = plainText.slice(0, charsToKeep) + '...';
            return html.slice(0, afterOpen) + truncatedText + closeTag;
          } else {
            return html.slice(0, closeEnd);
          }
        }
      }

      if (count === 0) {
        return truncateHtmlFallback(html, n * 80);
      }
      // If the total count of lines is less than or equal to n,
      // we force truncate to 1 line so the paywall is not at the very bottom.
      if (firstLineContent) {
        return firstLineContent;
      }
      return html;
    }

    const sliceContent = (html, n) => effectiveUnit === 'lines' ? sliceToLines(html, n) : sliceToBlocks(html, n);

    if (isMembersOnly && !isMember && !hasPaywallBypass) {
      const fullMembersContent = blog.content || '';
      blog.content = sliceContent(fullMembersContent, effectivePreview) || fullMembersContent.slice(0, 300);
      blog.paywall_preview = effectivePreview;
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
    const hasGrantedAccess = !!(sess.permissions?.can_access_premium_articles) || isInternalSSR;
    if (isPremium && !hasGrantedAccess) {
      let hasUnlocked = false;
      if (sess.member_logged_in && sess.member_id) {
        hasUnlocked = await repo.hasUnlockedBlog(db, sess.member_id, blog.slug);
      }

      if (!hasUnlocked) {
        blog.premium_locked = true;
        blog.premium_locked_reason = sess.member_logged_in ? 'credits' : 'login';
        blog.credits_required = creditsRequired;
        blog.paywall_preview = effectivePreview;
        const fullContent = blog.content || '';
        blog.content = sliceContent(fullContent, effectivePreview) || fullContent.slice(0, 300);
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

    // Public, non-locked posts can be cached by the browser/CDN for 5 minutes
    const isPublicAndOpen = !isAdmin && !isContributor && !blog.premium_locked && !isMembersOnly;
    if (isPublicAndOpen) {
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=60');
    } else {
      res.setHeader('Cache-Control', 'private, no-store');
    }

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
    // Match single-post gate: admin role alone does NOT bypass premium — only
    // explicit can_access_premium_articles permission or a paid unlock does.
    if (Number(b.is_premium) === 1 && !hasGrantedAccess && !unlockedSlugs.has(b.slug)) {
      b.premium_locked = true;
      const paras = (b.content || '').match(/<p[\s\S]*?<\/p>/gi) || [];
      b.content = paras[0] || (b.content || '').slice(0, 300);
      b.faqs = null;
    }

    // Strip internal-only fields (plagiarism_score, rejection_feedback,
    // draft_* edits, etc.) for anyone who isn't staff on THIS row. Using the
    // blanket `isContributor` flag here (instead of the per-row
    // `hasAdminAccess` computed above) would leak every other contributor's
    // internal fields to any logged-in contributor browsing the general
    // list, not just their own posts — the single-post endpoint already
    // gates this correctly on `hasAdminAccess`.
    if (!hasAdminAccess) stripInternalFields(b);
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
          is_members_only: rawIsMembersOnly = 0, send_notification_email = 0, status: requestedStatus, related_blogs,
          schema_type = 'BlogPosting', article_section = null, co_authors = [],
          difficulty_level: rawDifficultyLevel = null, preview_paragraphs: rawPreviewParagraphs = null,
          preview_unit: rawPreviewUnit = 'blocks' } = data;

  // Badges, is_premium, and credits_required are admin-only fields — contributors
  // submitting these in the request body must be silently ignored so they cannot
  // self-award trust badges or force a credits paywall on their own article.
  const badge_expert_reviewed = isAdmin ? (data.badge_expert_reviewed ?? 0) : 0;
  const badge_sap_notes_verified = isAdmin ? (data.badge_sap_notes_verified ?? 0) : 0;
  const badge_tested_s4hana = isAdmin ? (data.badge_tested_s4hana ?? 0) : 0;
  const badge_field_validated = isAdmin ? (data.badge_field_validated ?? 0) : 0;
  const is_premium = isAdmin ? (data.is_premium ?? 0) : 0;
  const credits_required = isAdmin ? (data.credits_required ?? 1) : 1;
  const preview_paragraphs = isAdmin && rawPreviewParagraphs != null ? (parseInt(rawPreviewParagraphs) || null) : null;
  const preview_unit = isAdmin ? (['lines', 'blocks'].includes(rawPreviewUnit) ? rawPreviewUnit : 'blocks') : 'blocks';
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
  const sanitizedFaqs = (Array.isArray(faqs) ? faqs : []).map(f => ({
    question: typeof f.question === 'string' ? sanitizeBlogHtml(f.question) : '',
    answer: typeof f.answer === 'string' ? sanitizeBlogHtml(f.answer) : '',
  }));
  const faqsJson = JSON.stringify(sanitizedFaqs);
  const relatedBlogsJson = Array.isArray(related_blogs) ? JSON.stringify(related_blogs) : (related_blogs || null);

  const mailService = MailService.getInstance();
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

    // Standard update — safe to clean up replaced files now that the live columns are being overwritten
    if (ex.image && ex.image !== image && ex.image.startsWith('/uploads/blogs/')) {
      deleteImage(ex.image);
    }
    const oldDownloads = extractDownloadUrls(ex.content);
    const newDownloads = new Set(extractDownloadUrls(content));
    for (const url of oldDownloads) {
      if (!newDownloads.has(url)) deleteUploadedFile(url);
    }

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
      preview_paragraphs, preview_unit,
      setPublishDate,
    });
    cache.invalidate('homepage_data_public');
    revalidateBlog(category, slug).catch(() => {});

    if (['approved','published'].includes(targetStatus)) {
      const { grantArticlePublishedCredits } = require('../services/CreditHelper');
      await grantArticlePublishedCredits(db, id).catch(() => {});
      if (send_notification_email) {
        mailService.queuePendingBlogNotifications().catch(() => {});
      }
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
      preview_paragraphs, preview_unit,
      publishDateVal,
    });
    cache.invalidate('homepage_data_public');
    if (['approved','published'].includes(targetStatus)) {
      revalidateBlog(category, slug).catch(() => {});
      const { grantArticlePublishedCredits } = require('../services/CreditHelper');
      await grantArticlePublishedCredits(db, newId).catch(() => {});
    }

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
  for (const url of extractDownloadUrls(blog.content)) deleteUploadedFile(url);
  await repo.deleteBlogById(db, id);
  new CacheService().invalidate('homepage_data_public');

  return res.json({ status: 'success', message: 'Blog deleted' });
});

// GET /api/posts/by-ids?ids=1,2,3 — fetch a small set of posts by ID for related-blogs widgets
const byIds = asyncHandler(async (req, res) => {
  const raw = String(req.query.ids || '');
  const ids = raw.split(',').map(s => s.trim()).filter(Boolean).slice(0, 20);
  if (!ids.length) return res.json([]);
  const rows = await repo.findByIds(req.db, ids);
  return res.json(rows);
});

module.exports = { exclusiveCount, suggested, updateBadges, byIds, list, save, remove };
