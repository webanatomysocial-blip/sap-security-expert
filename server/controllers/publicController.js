const crypto = require('crypto');
const CacheService = require('../services/CacheService');
const { asyncHandler } = require('../utils/asyncHandler');
const repo = require('../repositories/publicRepository');

const cache = new CacheService(1800);

// GET /api/homepage
const homepage = async (req, res) => {
  const db = req.db;
  const isAdmin = !!(req.session?.admin_logged_in);
  const isLocal = req.hostname === 'localhost' || req.hostname === '127.0.0.1';
  const cacheKey = 'homepage_data_public';

  if (!isAdmin && !isLocal) {
    const cached = await cache.get(cacheKey);
    if (cached) {
      const etag = '"' + crypto.createHash('md5').update(cached).digest('hex') + '"';
      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', 'public, max-age=1800');
      if (req.headers['if-none-match'] === etag) return res.status(304).end();
      return res.type('json').send(cached);
    }
    res.setHeader('Cache-Control', 'public, max-age=1800');
  } else {
    res.setHeader('Cache-Control', 'no-store');
  }

  try {
    const nowUtc = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Featured Insights: admin-curated blogs (homepage_featured_order set on the
    // dedicated admin page). Falls back to the latest 3 when none are curated.
    let heroArticles = await repo.findCuratedHeroArticles(db, nowUtc);
    if (!heroArticles.length) {
      heroArticles = await repo.findFallbackHeroArticles(db, nowUtc);
    }

    // Neither the homepage cards nor hero banner ever render the full
    // article body — only title/excerpt/image/author/date-type fields — but
    // findCuratedHeroArticles/findRecentBlogs select full rows (SELECT b.*),
    // full `content`/`draft_content` HTML included. Dropping those two
    // fields here cut this endpoint's real payload from ~350KB to ~12KB in
    // testing, for every consumer (this cached response, and the SSR page
    // that embeds it) without changing what's actually shown.
    const stripHeavyFields = (row) => {
      const { content: _c, draft_content: _dc, ...rest } = row;
      return rest;
    };

    // Independent homepage image with fallback to the blog's featured image.
    heroArticles = heroArticles.map(h => ({
      ...stripHeavyFields(h),
      hero_image: h.homepage_featured_image || h.image || null,
    }));

    const heroIds = heroArticles.map(h => h.id);
    const recent = (await repo.findRecentBlogs(db, { nowUtc, excludeIds: heroIds })).map(stripHeavyFields);
    const trending = await repo.findHomepageTrending(db, nowUtc);
    const contributors = await repo.findApprovedContributorsWithCounts(db);
    const expertPicks = await repo.findExpertPicks(db, nowUtc);
    const premiumArticles = await repo.findPremiumArticles(db, nowUtc);
    const latestNews = await repo.findNews(db, nowUtc);

    const payload = JSON.stringify({ status: 'success', heroArticles, recent, trending, contributors, expertPicks, premiumArticles, latestNews });
    if (!isAdmin && !isLocal) cache.set(cacheKey, payload).catch(() => {});
    else cache.invalidate(cacheKey);

    return res.type('json').send(payload);
  } catch (err) {
    console.error('[homepage_data]', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to load homepage data.' });
  }
};

// GET /api/popular-tags
const popularTags = async (req, res) => {
  const db = req.db;
  try {
    const rows = await repo.findTagsSample(db);
    const freq = {};
    rows.forEach(({ tags }) => {
      try {
        const list = typeof tags === 'string' ? JSON.parse(tags) : tags;
        if (Array.isArray(list)) list.forEach(t => { const k = t.trim(); if (k) freq[k] = (freq[k] || 0) + 1; });
      } catch { /* skip malformed */ }
    });
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([tag]) => tag);
    return res.json({ tags: sorted });
  } catch {
    return res.json({ tags: [] });
  }
};

// GET /api/search?q=... — header search popup
const search = async (req, res) => {
  const db = req.db;
  const q = String(req.query.q || '').trim();
  if (!q || q.length < 2) return res.json({ results: [] });
  // Cap length to keep the LIKE scan cheap and prevent oversized query params
  const safeQ = q.slice(0, 100);
  try {
    const rows = await repo.searchBlogs(db, `%${safeQ}%`);
    return res.json({ results: rows });
  } catch {
    return res.json({ results: [] });
  }
};

// GET /api/contributors/leaderboard
const leaderboard = asyncHandler(async (req, res) => {
  const rows = await repo.findLeaderboardContributors(req.db);
  return res.json(rows);
});

// GET /api/members/:id/public
const publicMemberProfile = asyncHandler(async (req, res) => {
  const db = req.db;
  const m = await repo.findPublicMemberById(db, req.params.id);
  if (!m) return res.status(404).json({ status: 'error', message: 'Member not found' });

  const membersRepo = require('../repositories/membersRepository');
  const [isContributor, ambassadorBadge] = await Promise.all([
    membersRepo.findContributorByEmail(db, m.email),
    membersRepo.findAmbassadorBadgeByEmail(db, m.email),
  ]);

  const vis = (() => {
    try { return m.profile_visibility ? JSON.parse(m.profile_visibility) : {}; } catch { return {}; }
  })();
  const defaults = { show_name: true, show_picture: true, show_company: false, show_email: false, show_country: true, show_in_directory: true, show_stats: true, show_badges: true };
  const v = { ...defaults, ...vis };
  const comment_count = await repo.countApprovedCommentsByMember(db, m.id);

  // Earned achievement badges — only included when the member allows it
  let badges = [];
  if (v.show_badges) {
    try {
      await membersRepo.ensureAchievementTables(db);
      const [types, earned] = await Promise.all([
        membersRepo.findAllAchievementTypes(db),
        membersRepo.findEarnedAchievements(db, m.id),
      ]);
      const earnedSet = new Set(earned.map(e => e.achievement_id));
      badges = types
        .filter(t => earnedSet.has(t.id))
        .map(t => ({ id: t.id, label: t.label, icon: t.icon, color: t.color }));
    } catch { badges = []; }
  }

  return res.json({
    id: m.id,
    name: v.show_name ? m.name : 'Community Member',
    profile_image: v.show_picture ? m.profile_image : null,
    job_role: m.job_role || null,
    company_name: v.show_company ? m.company_name : null,
    location: m.location || null,
    country: v.show_country ? m.country : null,
    joined: m.created_at,
    comment_count: v.show_stats ? comment_count : null,
    reputation_level: isContributor ? 'Contributor' : 'Explorer',
    ambassador_has_badge: ambassadorBadge && ambassadorBadge.has_badge ? 1 : 0,
    ambassador_badge_country: ambassadorBadge ? ambassadorBadge.country : null,
    ambassador_badge_year: ambassadorBadge ? ambassadorBadge.badge_year : null,
    ambassador_badge_years: ambassadorBadge ? ambassadorBadge.badge_years : [],
    badges,
  });
});

// GET /api/members/directory — public community directory
const memberDirectory = asyncHandler(async (req, res) => {
  const db = req.db;
  const candidates = await repo.findDirectoryCandidates(db);
  const defaults = { show_name: true, show_picture: true, show_company: false, show_country: true, show_in_directory: true };

  const results = candidates
    .map((m) => {
      let vis = {};
      try { vis = m.profile_visibility ? JSON.parse(m.profile_visibility) : {}; } catch { vis = {}; }
      return { m, v: { ...defaults, ...vis } };
    })
    .filter(({ v }) => v.show_in_directory)
    .map(({ m, v }) => ({
      id: m.id,
      name: v.show_name ? m.name : 'Community Member',
      profile_image: v.show_picture ? m.profile_image : null,
      job_role: m.job_role || null,
      company_name: v.show_company ? m.company_name : null,
      country: v.show_country ? m.country : null,
    }));

  return res.json({ status: 'success', members: results });
});

// GET /api/community/countries — member counts per country, for the "Meet the Community" page
const communityCountries = asyncHandler(async (req, res) => {
  const db = req.db;
  const [rows, totalMembers] = await Promise.all([
    repo.countMembersByCountry(db),
    repo.countApprovedMembers(db),
  ]);
  return res.json({
    status: 'success',
    total_members: totalMembers,
    total_countries: rows.length,
    countries: rows.map((r) => ({ country: r.country, count: r.count })),
  });
});

// GET /api/stats/community
const communityStats = async (req, res) => {
  const db = req.db;
  try {
    const stats = await repo.countCommunityStats(db);
    return res.json(stats);
  } catch {
    return res.json({ active_contributors: 0, total_members: 0 });
  }
};

// GET /api/categories
const categories = asyncHandler(async (req, res) => {
  const list = await repo.findDistinctCategories(req.db);
  return res.json(list);
});

// GET /api/trending
const trendingTopics = asyncHandler(async (req, res) => {
  const rows = await repo.findTrendingTopics(req.db);
  return res.json(rows);
});

// GET /api/announcements-public
const announcementsPublic = async (req, res) => {
  try {
    const rows = await repo.findPublicAnnouncements(req.db);
    return res.json(rows);
  } catch (err) {
    console.error('[announcements-public]', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to load announcements.' });
  }
};

const announcementPublicBySlug = async (req, res) => {
  try {
    const row = await repo.findPublicAnnouncementBySlug(req.db, req.params.slug);
    if (!row) return res.status(404).json({ error: 'Not found' });
    return res.json(row);
  } catch (err) {
    console.error('[announcements-public/:slug]', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to load announcement.' });
  }
};

// GET /api/admin/authors
// Email is intentionally excluded — this endpoint is used by the blog editor
// dropdown and does not need to expose PII to the frontend.
const authors = async (req, res) => {
  try {
    const rows = await repo.findActiveAuthors(req.db);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to load authors.' });
  }
};

// POST /api/views
const recordView = asyncHandler(async (req, res) => {
  const db = req.db;
  const { slug, post_id, visitor_token } = req.body || {};
  const id = slug || post_id;
  if (!id) return res.status(400).json({ status: 'error', message: 'slug or post_id required' });

  // Require a visitor token — without one we cannot deduplicate
  if (!visitor_token) return res.json({ status: 'skipped' });

  // Validate token is a known safe format (UUID or 64-char hex) to prevent oversized DB writes
  if (typeof visitor_token !== 'string' || visitor_token.length > 128 || !/^[a-zA-Z0-9_\-]+$/.test(visitor_token)) {
    return res.json({ status: 'skipped' });
  }

  // Resolve to the integer blog ID (post_views.post_id is INTEGER FK → blogs.id)
  let blogId;
  try { blogId = await repo.findBlogIdBySlugOrId(db, id); } catch (_) { return res.json({ status: 'skipped' }); }
  if (!blogId) return res.json({ status: 'skipped' });

  try {
    // Check if this visitor already viewed this post in the last 24 hours
    if (await repo.findRecentViewByVisitor(db, blogId, visitor_token)) {
      return res.json({ status: 'skipped' });
    }
    // Record the view and increment the counter atomically
    await repo.insertPostView(db, blogId, visitor_token);
    await repo.incrementViewCount(db, blogId);
  } catch (err) {
    console.error('[recordView]', err.message);
    return res.json({ status: 'skipped' });
  }
  return res.json({ status: 'success' });
});

// GET /api/captcha
const captcha = (req, res) => {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  req.session.captcha_ans = a + b;
  return res.json({ question: `${a} + ${b} = ?` });
};

// POST /api/send-mail — Contact Us form
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'hello@sapsecurityexpert.com';
const sendMail = asyncHandler(async (req, res) => {
  const db = req.db;
  const input = req.body || {};

  const captchaAns = parseInt(input.captchaAns || '0');
  const captchaExpected = parseInt(req.session.captcha_ans || '0');
  if (!captchaAns || captchaAns !== captchaExpected) {
    return res.status(400).json({ status: 'error', message: 'Invalid Captcha. Please try again.' });
  }
  // One-time use — force a fresh captcha for the next attempt either way
  req.session.captcha_ans = null;

  const name = (input.name || '').trim();
  const email = (input.email || '').trim();
  const reason = (input.reason || '').trim();
  const description = (input.description || '').trim();
  const companyName = (input.companyName || '').trim();
  const position = (input.position || '').trim();

  if (!name || !email || !reason || !description) {
    return res.status(400).json({ status: 'error', message: 'Please fill in all required fields.' });
  }
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ status: 'error', message: 'Please enter a valid email address.' });
  }

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const body = `
    <h2>New Contact Us Submission</h2>
    <p><strong>Name:</strong> ${esc(name)}</p>
    <p><strong>Email:</strong> ${esc(email)}</p>
    ${companyName ? `<p><strong>Company:</strong> ${esc(companyName)}</p>` : ''}
    ${position ? `<p><strong>Position:</strong> ${esc(position)}</p>` : ''}
    <p><strong>Subject:</strong> ${esc(reason)}</p>
    <p><strong>Message:</strong><br>${esc(description).replace(/\n/g, '<br>')}</p>
  `;

  const MailService = require('../services/MailService');
  const mailService = MailService.getInstance();
  const sent = await mailService.sendDirect(db, ADMIN_EMAIL, `Contact Form: ${reason}`, body);

  if (!sent) {
    return res.status(502).json({ status: 'error', message: 'Failed to send message. Please try again later.' });
  }
  return res.json({ status: 'success', message: 'Message sent successfully.' });
});

// POST /api/delete-account
const deleteAccount = async (req, res) => {
  const db = req.db;
  const sess = req.session;
  const { otp } = req.body || {};

  let memberEmail = sess.member_email || null;
  let memberName = sess.member_name || null;
  let memberId = sess.member_id || null;

  if (!memberEmail && sess.admin_id) {
    const user = await repo.findUserById(db, sess.admin_id);
    if (user) {
      memberEmail = user.email;
      memberName = user.full_name || user.username;
      memberId = await repo.findMemberIdByEmail(db, memberEmail);
    }
  }

  if (!memberEmail) return res.status(401).json({ status: 'error', message: 'Unauthorized. Please log in again.' });
  if (!otp) return res.status(400).json({ status: 'error', message: 'Verification code is required.' });

  try {
    const OTPService = require('../services/OTPService');
    const otpService = new OTPService(db);
    await otpService.verifyOTP(memberEmail, otp, 'delete_account');

    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const ip = req.ip || '0.0.0.0';

    await db.beginTransaction();
    let message;

    const hasActiveContributor = await repo.findActiveContributorIdByEmail(db, memberEmail);

    if (hasActiveContributor) {
      // Contributor: deactivate contributor and user account, and also member account
      await repo.deactivateContributorPath(db, { timestamp, ip, email: memberEmail, memberId });
      message = 'Your contributor and member accounts have been deactivated.';
    } else {
      // Regular member: deactivation
      await repo.deactivateMemberPath(db, { timestamp, ip, email: memberEmail, memberId });
      message = 'Your account has been deactivated.';
    }

    await db.commit();

    const MailService = require('../services/MailService');
    const NotificationService = require('../services/NotificationService');
    const notifier = new NotificationService(MailService.getInstance(), db);
    notifier.notifyAccountDeleted(memberEmail, memberName).catch(() => {});

    req.session.destroy(() => {});
    return res.json({ status: 'success', message });
  } catch (err) {
    // Always attempt rollback, not conditioned on `db.inTransaction` — that
    // property only exists on the dev-mode SQLiteAdapter, not on real mysql2
    // pool connections, so in production this never rolled back and left an
    // open transaction (holding row locks on users/members/contributors) on
    // the connection when it was returned to the pool, eventually wedging
    // every other request that touched those rows. rollback() on a
    // connection with no active transaction is a harmless no-op in mysql2.
    await db.rollback().catch(() => {});
    console.error('[delete_account]', err.message);
    const isOtpError = /invalid|expired|code/i.test(err.message);
    return res.status(isOtpError ? 400 : 500)
      .json({ status: 'error', message: isOtpError ? err.message : 'Failed to delete account.' });
  }
};

// GET /api/content?slug=... — plaintext content for AI crawlers (?plaintext=1 redirect target)
const content = async (req, res) => {
  const db = req.db;
  const { slug, format } = req.query;
  if (!slug) return res.status(400).send('slug is required');

  try {
    const b = await repo.findBlogForContent(db, slug);
    if (!b) return res.status(404).send('Not found');

    if (format === 'json') {
      return res.json({ title: b.title, author: b.author_name, date: b.date, excerpt: b.excerpt, content: b.content });
    }
    // Default: plain text (strip HTML tags)
    const plainContent = (b.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    res.set('Content-Type', 'text/plain; charset=utf-8');
    return res.send(`${b.title}\nBy ${b.author_name} | ${b.date}\n\n${b.excerpt || ''}\n\n${plainContent}`);
  } catch (err) {
    return res.status(500).send('Server error');
  }
};

// GET /api/sitemap.xml (also served at /sitemap.xml via index.js)
const sitemap = async (req, res) => {
  const db = req.db;
  try {
    // Always use the canonical production domain — never localhost
    const siteUrl = (process.env.CANONICAL_URL || 'https://sapsecurityexpert.com').replace(/\/$/, '');
    const today = new Date().toISOString().slice(0, 10);

    const blogs = await repo.findBlogsForSitemap(db);

    const staticPages = [
      { loc: '/',                             priority: '1.0', changefreq: 'daily'   },
      { loc: '/blogs',                        priority: '0.9', changefreq: 'daily'   },
      { loc: '/about',                        priority: '0.7', changefreq: 'monthly' },
      { loc: '/contact-us',                   priority: '0.6', changefreq: 'monthly' },
      { loc: '/podcasts',                     priority: '0.7', changefreq: 'weekly'  },
      { loc: '/videos',                       priority: '0.7', changefreq: 'weekly'  },
      { loc: '/product-reviews',              priority: '0.7', changefreq: 'weekly'  },
      { loc: '/expert-recommendations',       priority: '0.7', changefreq: 'weekly'  },
      { loc: '/expert-papers',                priority: '0.7', changefreq: 'weekly'  },
      { loc: '/downloads',                    priority: '0.7', changefreq: 'weekly'  },
      { loc: '/become-a-contributor',         priority: '0.6', changefreq: 'monthly' },
      { loc: '/experts/raghu-boddu',          priority: '0.8', changefreq: 'monthly' },
      { loc: '/learning/security-fundamentals', priority: '0.7', changefreq: 'monthly' },
      { loc: '/learning/user-management',      priority: '0.7', changefreq: 'monthly' },
      { loc: '/learning/role-management',      priority: '0.7', changefreq: 'monthly' },
      { loc: '/learning/authorization-concepts', priority: '0.7', changefreq: 'monthly' },
      { loc: '/learning/audit-compliance',     priority: '0.7', changefreq: 'monthly' },
      { loc: '/learning/grc-advanced',         priority: '0.7', changefreq: 'monthly' },
    ];

    const categoryPages = [
      'sap-security', 'sap-grc', 'sap-btp-security', 'sap-cybersecurity',
      'sap-iag', 'sap-s4hana-security', 'sap-fiori-security', 'sap-sac-security',
      'sap-cis', 'sap-successfactors-security', 'sap-access-control',
      'sap-process-control', 'sap-public-cloud', 'sap-security-other',
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n`;

    // Static pages
    for (const p of staticPages) {
      xml += `  <url><loc>${siteUrl}${p.loc}</loc><lastmod>${today}</lastmod><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>\n`;
    }

    // Category pillar pages
    for (const cat of categoryPages) {
      xml += `  <url><loc>${siteUrl}/${cat}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
    }

    // Blog articles
    for (const b of blogs) {
      const lastmod = (b.updated_at || b.date || today).toString().slice(0, 10);
      xml += `  <url><loc>${siteUrl}/${b.category}/${b.slug}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>\n`;
    }

    xml += '</urlset>';
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(xml);
  } catch (err) {
    return res.status(500).send('<?xml version="1.0"?><urlset/>');
  }
};

// GET /api/posts-sitemap (lightweight posts data for sitemap generation)
const postsSitemap = async (req, res) => {
  const db = req.db;
  try {
    const blogs = await repo.findBlogsForSitemap(db);
    return res.json(blogs);
  } catch (err) {
    return res.status(500).json([]);
  }
};

// ── SEO Meta endpoint for Next.js generateMetadata ──────────────────────────
// GET /api/seo-meta?path=/articles/some-slug
const SEO_STATIC = {
  '/': {
    title: 'The Global Community for SAP Security & ERP Cybersecurity Professionals',
    description: 'Discover SAP Security Expert for SAP Security, GRC, Cybersecurity, SAP BTP, SAP IAG, S/4HANA Security, tutorials, best practices, expert insights, and community resources to strengthen your SAP landscape.',
  },
  '/blogs': { title: 'SAP Security Blogs & Articles — Expert Tutorials, Guides & Best Practices', description: 'Browse all SAP Security, GRC, BTP, and cybersecurity articles written by practitioners. Filter by category, search by topic, and find the expert knowledge you need.' },
  '/about': { title: 'About SAP Security Expert — Independent Platform for SAP Security & GRC Practitioners', description: 'SAP Security Expert is a practitioner-built, independent knowledge platform for SAP Security, GRC, and BTP professionals. Learn about our mission, editorial standards, and the experts behind the content.' },
  '/contact-us': { title: 'Contact SAP Security Expert — Questions, Partnerships & Content Enquiries', description: 'Reach the SAP Security Expert team for content partnerships, contributor questions, advertiser enquiries, or general feedback. We reply to every genuine enquiry.' },
  '/podcasts': { title: 'SAP Security Podcast — Expert Interviews & Practitioner Conversations', description: 'Listen to SAP security practitioners discuss access risk, GRC implementation, BTP security, and enterprise compliance challenges. Real conversations from the field.' },
  '/reviews': { title: 'SAP GRC & Security Product Reviews — Independent Practitioner Analysis', description: 'Read honest, practitioner-written reviews of SAP GRC, IAG, access risk, and cybersecurity tools. Technical analysis to help you evaluate and select the right SAP security products.' },
  '/expert-recommendations': { title: 'SAP Security Expert Picks — Curated Resources Recommended by Practitioners', description: 'Articles, tools, and resources hand-picked by SAP Security practitioners. The best practical guidance on authorization, GRC, compliance, and SAP security operations — vetted by the community.' },
  '/expert-papers': { title: 'SAP Security Expert Papers — In-Depth Research & Technical Deep Dives', description: 'Read practitioner-authored papers on SAP GRC strategy, access risk frameworks, BTP security architecture, and enterprise security programme design. Detailed technical analysis, not vendor content.' },
  '/news': { title: 'SAP Security News — Threat Intelligence, Patches & Industry Updates', description: 'The latest SAP security news: vulnerability advisories, SAP patch releases, regulatory changes, GRC product updates, and cybersecurity threat intelligence for SAP landscapes.' },
  '/learning-hub': { title: 'SAP Security Learning Hub — Free Structured Courses & Guided Learning Paths', description: 'Learn SAP Security step-by-step with free structured modules covering authorizations, user administration, role design, GRC, and BTP security. Practical tutorials from beginner to advanced.' },
  '/become-a-contributor': { title: 'Write for SAP Security Expert | Become a Contributor', description: 'Share your SAP Security expertise. Join our contributor programme and publish guides, tutorials, and best practices to the SAP security community.' },
  '/experts/raghu-boddu': { title: 'Raghu Boddu — SAP Security & GRC Expert, Founder of SAP Security Expert', description: 'Raghu Boddu is an SAP Security and GRC expert with 25+ years of experience, SAP PRESS author, and founder of SAP Security Expert and CEO of ToggleNow Global.' },
  '/videos': { title: 'SAP Security Video Library — Short Insights from Global Practitioners', description: 'Watch two-minute perspectives from SAP Security professionals on authorization design, GRC tools, BTP security, and real-world implementation challenges.' },
  '/product-reviews': { title: 'SAP GRC & Security Product Reviews — Independent Practitioner Analysis', description: 'Read honest, practitioner-written reviews of SAP GRC, IAG, access risk, and cybersecurity tools. Technical analysis to help you evaluate and select the right SAP security products.' },
  '/contributors': { title: 'SAP Security Contributors Leaderboard — Top-Ranked SAP & GRC Experts', description: 'Discover the most active contributors to the SAP Security Expert community, ranked by published articles, expertise, and community impact.' },
  '/leaderboard': { title: 'SAP Security Contributors Leaderboard — Top-Ranked SAP & GRC Experts', description: 'Discover the most active contributors to the SAP Security Expert community, ranked by published articles, expertise, and community impact.' },
  '/ambassadors': { title: 'SAP Security Country Ambassadors — Local Community Leaders Worldwide', description: 'Meet the SAP Security Expert Country Ambassadors leading local SAP Security and GRC communities across Europe, Asia-Pacific, the Americas, and the Middle East.' },
  '/community': { title: 'SAP Security Community — Practitioners, Contributors & Global Experts', description: 'Connect with SAP Security, GRC, and BTP professionals worldwide. Browse contributor profiles, find country ambassadors, and explore the community behind SAP Security Expert.' },
  '/transactions': { title: 'SAP Security Transactions Reference Guide | SAP Security Expert', description: 'A complete reference guide to important SAP security transactions — PFCG, SU01, SM20, RSECADMIN, and more, with practical usage tips for each.' },
  '/sap-licensing': { title: 'SAP Licensing Guide & Compliance | SAP Security Expert', description: 'Understand SAP licensing metrics, user types, indirect access rules, and contract optimisation strategies to manage costs and avoid audit risk.' },
  '/announcements': { title: 'SAP Security Expert Announcements — Platform News & Community Updates', description: 'Platform announcements, new feature releases, community milestones, and updates from the SAP Security Expert team.' },
  '/sitemap': { title: 'Sitemap | SAP Security Expert', description: 'A complete directory of all pages on SAP Security Expert — SAP Security, GRC, BTP, Learning Hub, and more.' },
  '/downloads': { title: 'Free SAP Security Downloads — Templates, Checklists & Audit Tools', description: 'Download practitioner-curated SAP security resources: role design templates, SoD conflict matrices, GRC configuration guides, security audit checklists, and ABAP security frameworks.' },
  '/privacy-policy': { title: 'Privacy & Cookie Policy — How SAP Security Expert Handles Your Data', description: 'Read the SAP Security Expert privacy and cookie policy. Understand how we collect, use, store, and protect your personal data when you use our platform.' },
  '/terms-conditions': { title: 'Terms & Conditions — SAP Security Expert Platform Rules & Usage', description: 'Review the terms and conditions governing your use of the SAP Security Expert platform, its content, contributor programme, and credit-based article access.' },
  '/accessibility-statement': { title: 'Accessibility Statement — SAP Security Expert\'s Commitment to Inclusive Access', description: 'SAP Security Expert is committed to making our platform accessible to all users. Read our accessibility statement and learn how we meet WCAG standards.' },
  '/safety-movement': { title: 'SAP Security Expert Safety Movement — Our Commitment to a Safe, Inclusive Community', description: 'Learn about the SAP Security Expert Safety Movement and our commitment to creating a safe, respectful, and inclusive environment for SAP Security practitioners worldwide.' },
  '/security-compliance-overview': { title: 'Security & Compliance Overview — How SAP Security Expert Protects the Platform', description: 'An overview of the security controls, data protection practices, and compliance standards in place at SAP Security Expert to keep the platform and its users safe.' },
  '/responsible-ai-automation-statement': { title: 'Responsible AI & Automation Statement — SAP Security Expert\'s Approach to AI', description: 'Read how SAP Security Expert uses AI and automation responsibly in content creation, moderation, and platform operations — with human editorial oversight at every step.' },
  '/apply-contributor': { title: 'Contributor Application | SAP Security Expert', description: 'Apply to become a contributor at SAP Security Expert. Share your SAP security expertise with a global community of professionals.' },
  '/privacy-and-data-protection': { title: 'Your Rights & Data Privacy — SAP Security Expert', description: 'Understand your data privacy rights at SAP Security Expert: access, correction, deletion, and how we handle personal data under GDPR and applicable data protection law.' },
  '/sap-security-fundamentals': { title: 'SAP Security Fundamentals — Beginner\'s Guide to Access Control & Authorizations', description: 'New to SAP Security? Start here. Learn the core concepts of SAP authorization, role design, user types, and compliance basics with step-by-step guides built for practitioners.' },
  '/membership': { title: 'Unlock Premium SAP Security Articles — Credits & Access Plans', description: 'Buy credits once to unlock any premium SAP Security, GRC, or BTP article. Lifetime access, no subscription required. Keep every article you unlock, forever.' },
  '/learning/security-fundamentals': { title: 'SAP Security Fundamentals — Module 01 of the SAP Security Learning Hub', description: 'Start learning SAP Security from the ground up. Foundational concepts, system architecture, and the mental model every SAP Security practitioner needs first.' },
  '/learning/user-management': { title: 'SAP User Management & SU01 — Module 02 of the SAP Security Learning Hub', description: 'Master SAP user administration: SU01 maintenance, user types, validity periods, logon parameters, and the lifecycle transactions you will use every day.' },
  '/learning/role-management': { title: 'SAP Role Design & PFCG — Module 03 of the SAP Security Learning Hub', description: 'Build, derive, and maintain SAP roles in PFCG. Single roles, composite roles, derived roles, and the transport strategies that keep them consistent across landscapes.' },
  '/learning/authorization-concepts': { title: 'SAP Authorization Concepts — Module 04 of the SAP Security Learning Hub', description: 'Understand the authorization plumbing under SAP roles: auth objects, field values, profiles, and the runtime check engine that grants or denies every transaction.' },
  '/learning/audit-compliance': { title: 'SAP Audit & Compliance — Module 05 of the SAP Security Learning Hub', description: 'Learn how to track who did what in SAP and prove it to auditors. Security Audit Log, system profiling, SoD reporting, and audit-readiness strategies.' },
  '/learning/grc-advanced': { title: 'SAP GRC & Advanced Topics — Module 06 of the SAP Security Learning Hub', description: 'Go beyond the basics with SAP GRC Access Control, IAG, Process Control, BTP security, and the enterprise governance layer that ties it all together.' },
};

const SEO_CATEGORIES = {
  'sap-security': { title: 'SAP Security Guide: Roles, Authorizations & Best Practices', description: 'Explore SAP Security tutorials, role management, authorizations, auditing, compliance, and best practices to secure your SAP landscape with expert insights.' },
  'sap-s4hana-security': { title: 'SAP S/4HANA Security: Best Practices & Expert Guides', description: 'Learn SAP S/4HANA Security with expert guides on roles, authorizations, Fiori security, compliance, cloud security, and best practices for protecting your SAP landscape.' },
  'sap-fiori-security': { title: 'SAP Fiori Security: Roles, Authorization & Best Practices', description: 'Learn SAP Fiori Security with expert guides on roles, authorizations, authentication, Launchpad security, and best practices to secure your SAP Fiori environment.' },
  'sap-btp-security': { title: 'SAP BTP Security: Best Practices & Expert Guides', description: 'Explore SAP BTP Security with expert guides on identity and access management, authentication, authorization, cloud security, and best practices.' },
  'sap-public-cloud': { title: 'SAP Public Cloud Guide: Security & Best Practices', description: 'Learn SAP S/4HANA Cloud Public Edition security, including IAM, IAS/IPS, user access, business catalogs, integrations, audit strategies, and best practices.' },
  'sap-sac-security': { title: 'SAP Analytics Cloud Security Guide | SAP Security Expert', description: 'Explore SAP Analytics Cloud Security with expert guides on user access, roles, permissions, authentication, data protection, and security governance best practices.' },
  'sap-cis': { title: 'SAP CIS Security Guide | IAS, IPS & Identity Management', description: 'Explore SAP Cloud Identity Services (CIS) with expert guides on IAS, IPS, identity management, authentication, provisioning, and secure access governance.' },
  'sap-successfactors-security': { title: 'SAP SuccessFactors Security Guide | SAP Security Expert', description: 'Learn SAP SuccessFactors Security best practices for roles, permissions, identity management, authentication, data protection, and secure HR access governance.' },
  'sap-security-other': { title: 'SAP Security Topics & Expert Guides | SAP Security Expert', description: 'Explore SAP Security resources covering tools, technologies, governance, compliance, and best practices to strengthen SAP landscapes with expert insights.' },
  'sap-grc': { title: 'SAP GRC Guide: Access Control & Risk Management', description: 'Explore SAP GRC solutions with expert guides on Access Control, SoD analysis, risk management, compliance, workflows, and SAP security best practices.' },
  'sap-access-control': { title: 'SAP Access Control: Roles, SoD & Best Practices', description: 'Learn SAP Access Control best practices for user access, roles, SoD analysis, risk management, approvals, and governance to secure SAP environments.' },
  'sap-process-control': { title: 'SAP Process Control: Compliance & Risk Management Guide', description: 'Explore SAP Process Control for compliance management, internal controls, risk monitoring, control automation, and audit readiness with expert SAP insights.' },
  'sap-iag': { title: 'SAP IAG: Identity Access Governance & Best Practices', description: 'Explore SAP IAG with expert guides on identity access governance, user provisioning, access requests, risk analysis, IAM, and secure SAP cloud access.' },
  'sap-cybersecurity': { title: 'SAP Cybersecurity Guide | SAP Security Best Practices', description: 'Explore SAP Cybersecurity best practices for threat protection, vulnerability management, monitoring, incident response, and securing SAP applications and data.' },
  'sap-licensing': { title: 'SAP Licensing Guide & Compliance | SAP Security Expert', description: 'Understand SAP licensing metrics, user types, indirect access rules, and contract optimisation strategies to manage costs and avoid audit risk.' },
  'downloads': { title: 'SAP Security Downloads — Templates, Tools & Checklists | SAP Security Expert', description: 'Download free SAP security templates, audit checklists, GRC configuration guides, and tools curated by SAP security professionals.' },
};

const DEFAULT_META = {
  title: 'SAP Security, GRC & Cybersecurity Community - Tutorials & Best Practices | SAP Security Expert',
  description: 'Join 10,000+ SAP Security, GRC, and BTP professionals. Access expert tutorials, best practices, and guides to protect your SAP landscape and advance your career.',
};

const seoMeta = asyncHandler(async (req, res) => {
  const db = req.db;
  const path = (req.query.path || '/').replace(/\?.*$/, '').replace(/\/$/, '') || '/';
  const siteUrl = (process.env.CANONICAL_URL || 'https://sapsecurityexpert.com').replace(/\/$/, '');

  res.setHeader('Cache-Control', 'public, max-age=300');

  // 1. Static page
  if (SEO_STATIC[path]) {
    return res.json({ status: 'success', ...SEO_STATIC[path], url: siteUrl + path });
  }

  // 2. Category page  e.g. /sap-grc  (exactly one segment — NOT /sap-grc/slug,
  // which is a blog post under that category and must fall through to case 3
  // for its own title/description/image, not the category's generic meta).
  const parts = path.replace(/^\//, '').split('/');
  const catKey = parts[0];
  if (parts.length === 1 && SEO_CATEGORIES[catKey]) {
    return res.json({ status: 'success', ...SEO_CATEGORIES[catKey], url: siteUrl + path });
  }

  // 3. Blog/article page  e.g. /articles/slug  or  /sap-grc/slug
  if (parts.length >= 2) {
    const slug = parts[parts.length - 1];
    try {
      const b = await repo.findBlogForSeoMeta(db, slug);
      if (b) {
        // Strip markdown and HTML tags from a string to clean up preview text
        const cleanText = (str) => {
          if (!str) return '';
          return str
            .replace(/<\/?[^>]+(>|$)/g, '') // Strip HTML tags
            .replace(/[#*`_\[\]()\-]/g, ' ') // Strip common markdown characters
            .replace(/\s+/g, ' ')            // Collapse extra whitespaces
            .trim();
        };

        let desc = b.meta_description;
        if (!desc && b.excerpt) {
          desc = cleanText(b.excerpt);
        }
        if (!desc && b.content) {
          desc = cleanText(b.content).slice(0, 155);
        }
        if (!desc) {
          desc = DEFAULT_META.description;
        }

        const rawTitle = b.meta_title || b.title;
        const title = rawTitle.includes('|') ? rawTitle : `${rawTitle} | SAP Security Expert`;
        const rawImage = b.image || null;
        const image = rawImage
          ? (rawImage.startsWith('http') ? rawImage : siteUrl + rawImage)
          : null;

        return res.json({
          status: 'success',
          title,
          description: desc,
          keywords: b.meta_keywords || null,
          image,
          author: b.author_name,
          url: siteUrl + path,
        });
      }
    } catch (_) {}
  }

  // 4. Default
  return res.json({ status: 'success', ...DEFAULT_META, url: siteUrl + path });
});

// ── News/Updates public endpoints ─────────────────────────────────────────

// GET /api/learnings — published learnings (optional ?category=<slug>)
const learnings = async (req, res) => {
  const db = req.db;
  const { category } = req.query;
  const nowUtc = new Date().toISOString().slice(0, 19).replace('T', ' ');
  try {
    const rows = await repo.findLearnings(db, { nowUtc, category });
    return res.json(rows);
  } catch (err) {
    console.error('[GET /api/learnings]', err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

// GET /api/learnings/counts — count of published learnings per module category
const learningsCounts = async (req, res) => {
  const db = req.db;
  const nowUtc = new Date().toISOString().slice(0, 19).replace('T', ' ');
  try {
    const rows = await repo.findLearningsCounts(db, nowUtc);
    const counts = {};
    rows.forEach(r => { counts[r.category] = Number(r.count); });
    return res.json(counts);
  } catch (err) {
    console.error('[GET /api/learnings/counts]', err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

// GET /api/news — list published news items
const news = async (req, res) => {
  const db = req.db;
  const nowUtc = new Date().toISOString().slice(0, 19).replace('T', ' ');
  try {
    const rows = await repo.findNews(db, nowUtc);
    return res.json(rows);
  } catch (err) {
    console.error('[GET /api/news]', err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

// GET /api/news/:slug
const newsBySlug = async (req, res) => {
  const db = req.db;
  const { slug } = req.params;
  try {
    const row = await repo.findNewsBySlugOrId(db, slug);
    if (!row) return res.status(404).json({ error: 'News item not found' });
    return res.json(row);
  } catch (err) {
    console.error('[GET /api/news/:slug]', err.message);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

const fs = require('fs');
const path = require('path');

// Reads the latest version from CHANGELOG.md (first ## [x.y.z] line),
// falls back to the latest DB entry, then falls back to '3.0.0'.
const appVersion = async (req, res) => {
  try {
    const changelogPath = path.join(__dirname, '../../CHANGELOG.md');
    if (fs.existsSync(changelogPath)) {
      const text = fs.readFileSync(changelogPath, 'utf8');
      const match = text.match(/^## \[([^\]]+)\]/m);
      if (match) return res.json({ version: match[1] });
    }
    // Fall back to latest DB entry
    const [rows] = await req.db.execute(
      'SELECT version FROM changelogs ORDER BY created_at DESC LIMIT 1'
    );
    if (rows.length) return res.json({ version: rows[0].version });
    return res.json({ version: '3.0.0' });
  } catch {
    return res.json({ version: '3.0.0' });
  }
};

// GET /api/geoip — server-side IP geolocation proxy so browsers never get blocked by CORS/adblockers
const geoip = async (req, res) => {
  try {
    const rawIp =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.socket?.remoteAddress ||
      '';
    // If local/loopback, ipwho.is will inspect the caller's public IP
    const url = rawIp && rawIp !== '::1' && rawIp !== '127.0.0.1'
      ? `https://ipwho.is/${rawIp}`
      : 'https://ipwho.is/';

    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      return res.json({
        status: 'success',
        country: data.country || '',
        state: data.region || '',
        city: data.city || '',
        latitude: data.latitude,
        longitude: data.longitude,
      });
    }
    return res.json({ status: 'fail' });
  } catch (err) {
    console.error('[GET /api/geoip]', err.message);
    return res.status(500).json({ status: 'error' });
  }
};

module.exports = {
  homepage, popularTags, search, leaderboard, publicMemberProfile, memberDirectory, communityCountries, communityStats, categories, trendingTopics,
  announcementsPublic, announcementPublicBySlug, authors, recordView, captcha, deleteAccount, content, sitemap, seoMeta, postsSitemap,
  learnings, learningsCounts, news, newsBySlug, sendMail, appVersion, geoip,
};

