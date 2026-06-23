/**
 * Public / miscellaneous read-only endpoints.
 */
const router = require('express').Router();
const crypto = require('crypto');
const CacheService = require('../services/CacheService');

const cache = new CacheService(1800);

const AUTHOR_FIELDS = `
  CASE WHEN u.role = 'admin' OR b.author_id IS NULL OR b.author_id = 1 THEN 'Raghu Boddu'
       ELSE COALESCE(c.full_name, b.author) END AS author_name,
  CASE WHEN u.role = 'admin' OR b.author_id IS NULL OR b.author_id = 1 THEN '/assets/raghu_boddu.png'
       ELSE COALESCE(c.image, '/assets/placeholder.webp') END AS author_image,
  CASE WHEN u.role = 'admin' OR b.author_id IS NULL OR b.author_id = 1
       THEN COALESCE(u.bio, 'Founder & Security Expert at SAP Security Expert.')
       ELSE COALESCE(c.short_bio, 'Contributor') END AS author_bio
`;

// GET /api/get_homepage_data.php
router.get(['/get_homepage_data.php', '/homepage'], async (req, res) => {
  const db = req.db;
  const isAdmin = !!(req.session?.admin_logged_in);
  const isLocal = req.hostname === 'localhost' || req.hostname === '127.0.0.1';
  const cacheKey = 'homepage_data_public';

  if (!isAdmin && !isLocal) {
    const cached = cache.get(cacheKey);
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

    const [heroArticles] = await db.execute(
      `SELECT b.*, b.view_count, b.category,
        (SELECT COUNT(*) FROM comments c2 WHERE c2.post_id = b.slug AND c2.status = 'approved') AS comment_count,
        ${AUTHOR_FIELDS}
       FROM blogs b
       LEFT JOIN users u ON b.author_id = u.id
       LEFT JOIN contributors c ON u.contributor_id = c.id
       WHERE b.status IN ('approved','published') AND b.date <= ?
         AND (b.type IS NULL OR b.type = 'blog')
       ORDER BY b.date DESC, b.id DESC LIMIT 3`,
      [nowUtc]
    );

    const heroIds = heroArticles.map(h => h.id);
    const excludeSql = heroIds.length ? `AND b.id NOT IN (${heroIds.map(() => '?').join(',')})` : '';
    const [recent] = await db.execute(
      `SELECT b.*, b.view_count, b.category,
        (SELECT COUNT(*) FROM comments c2 WHERE c2.post_id = b.slug AND c2.status = 'approved') AS comment_count,
        ${AUTHOR_FIELDS}
       FROM blogs b
       LEFT JOIN users u ON b.author_id = u.id
       LEFT JOIN contributors c ON u.contributor_id = c.id
       WHERE b.status = 'approved' AND b.date <= ?
         AND (b.type IS NULL OR b.type = 'blog') ${excludeSql}
       ORDER BY b.date DESC, b.id DESC LIMIT 10`,
      [nowUtc, ...heroIds]
    );

    const [trending] = await db.execute(
      `SELECT id, title, slug, category, view_count FROM blogs
       WHERE status IN ('approved','published') AND date <= ?
         AND (type IS NULL OR type = 'blog')
       ORDER BY view_count DESC LIMIT 5`,
      [nowUtc]
    );

    const [contributors] = await db.execute(
      `SELECT id, full_name, role, image AS profile_image, created_at,
         (SELECT COUNT(*) FROM blogs b JOIN users u ON b.author_id = u.id
          WHERE u.contributor_id = contributors.id AND b.status IN ('approved','published')) AS contributions_count
       FROM contributors WHERE status = 'approved' ORDER BY created_at DESC`
    );

    const payload = JSON.stringify({ status: 'success', heroArticles, recent, trending, contributors });
    if (!isAdmin && !isLocal) cache.set(cacheKey, payload);
    else cache.invalidate(cacheKey);

    return res.type('json').send(payload);
  } catch (err) {
    console.error('[homepage_data]', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to load homepage data.' });
  }
});

// GET /api/stats/community  or  GET /api/get_community_stats.php
router.get(['/stats/community', '/get_community_stats.php'], async (req, res) => {
  const db = req.db;
  try {
    const [[c]] = await db.execute("SELECT COUNT(*) as c FROM contributors WHERE status = 'approved'");
    const [[m]] = await db.execute("SELECT COUNT(*) as c FROM members WHERE status = 'approved'");
    return res.json({ active_contributors: c.c, total_members: m.c });
  } catch {
    return res.json({ active_contributors: 0, total_members: 0 });
  }
});

// GET /api/get_categories.php
router.get(['/get_categories.php', '/categories'], async (req, res) => {
  const db = req.db;
  try {
    const [rows] = await db.execute(
      "SELECT DISTINCT category FROM blogs WHERE status IN ('approved','published') AND category IS NOT NULL ORDER BY category ASC"
    );
    return res.json(rows.map(r => r.category));
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// GET /api/get_trending_topics.php
router.get(['/get_trending_topics.php', '/trending'], async (req, res) => {
  const db = req.db;
  try {
    const [rows] = await db.execute(
      `SELECT id, title, slug, category, view_count FROM blogs
       WHERE status IN ('approved','published') ORDER BY view_count DESC LIMIT 10`
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// GET /api/get_announcements.php
router.get(['/get_announcements.php', '/announcements-public'], async (req, res) => {
  const db = req.db;
  try {
    const [rows] = await db.execute(
      "SELECT * FROM announcements WHERE status IN ('approved','active','published') ORDER BY created_at DESC"
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// GET /api/get_authors.php  or  GET /api/admin/authors
router.get(['/get_authors.php', '/admin/authors'], async (req, res) => {
  const db = req.db;
  try {
    const [rows] = await db.execute(
      `SELECT u.id, u.username, u.email, u.role,
         COALESCE(c.full_name, u.full_name, u.username) as display_name,
         COALESCE(c.image, u.profile_image) as image
       FROM users u
       LEFT JOIN contributors c ON u.contributor_id = c.id
       WHERE u.is_active = 1 ORDER BY u.role DESC, display_name ASC`
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/views  or  POST /api/save_view.php
router.post(['/views', '/save_view.php'], async (req, res) => {
  const db = req.db;
  const { slug, post_id, visitor_token } = req.body || {};
  const id = slug || post_id;
  if (!id) return res.status(400).json({ status: 'error', message: 'slug or post_id required' });

  // Require a visitor token — without one we cannot deduplicate
  if (!visitor_token) return res.json({ status: 'skipped' });

  try {
    // Resolve to the integer blog ID (post_views.post_id is INTEGER FK → blogs.id)
    const [blogRows] = await db.execute(
      'SELECT id FROM blogs WHERE slug = ? OR id = ? LIMIT 1',
      [id, id]
    );
    if (!blogRows.length) return res.json({ status: 'skipped' });
    const blogId = blogRows[0].id;

    // Check if this visitor already viewed this post in the last 24 hours
    const [existing] = await db.execute(
      `SELECT id FROM post_views WHERE post_id = ? AND visitor_token = ?
       AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY) LIMIT 1`,
      [blogId, visitor_token]
    );
    if (existing.length > 0) return res.json({ status: 'skipped' });

    // Record the view and increment the counter atomically
    await db.execute(
      'INSERT IGNORE INTO post_views (post_id, visitor_token) VALUES (?, ?)',
      [blogId, visitor_token]
    );
    await db.execute(
      'UPDATE blogs SET view_count = COALESCE(view_count, 0) + 1 WHERE id = ?',
      [blogId]
    );
    return res.json({ status: 'success' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// GET /api/get_captcha.php
router.get(['/get_captcha.php', '/captcha'], (req, res) => {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  req.session.captcha_ans = a + b;
  return res.json({ question: `${a} + ${b} = ?` });
});

// POST /api/delete_account.php
router.post(['/delete_account.php', '/delete-account'], async (req, res) => {
  const db = req.db;
  const sess = req.session;
  const { otp } = req.body || {};

  let memberEmail = sess.member_email || null;
  let memberName = sess.member_name || null;
  let memberId = sess.member_id || null;

  if (!memberEmail && sess.admin_id) {
    const [rows] = await db.execute('SELECT email, full_name, username FROM users WHERE id = ?', [sess.admin_id]);
    if (rows.length) {
      memberEmail = rows[0].email;
      memberName = rows[0].full_name || rows[0].username;
      const [mr] = await db.execute('SELECT id FROM members WHERE LOWER(email) = LOWER(?)', [memberEmail]);
      memberId = mr[0]?.id || null;
    }
  }

  if (!memberEmail) return res.status(401).json({ status: 'error', message: 'Unauthorized. Please log in again.' });
  if (!otp) return res.status(400).json({ status: 'error', message: 'Verification code is required.' });

  try {
    const OTPService = require('../services/OTPService');
    const otpService = new OTPService(db);
    await otpService.verifyOTP(memberEmail, otp, 'delete_account');

    const randomId = Math.floor(Math.random() * 900000 + 100000);
    const deletedEmail = `deleted_user_${randomId}_${memberEmail}`;
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const ip = req.ip || '0.0.0.0';

    await db.beginTransaction();
    let message;

    const [contRows] = await db.execute(
      "SELECT id FROM contributors WHERE LOWER(email) = LOWER(?) AND is_deleted = 0", [memberEmail]
    );

    if (contRows.length) {
      // Contributor: deactivate contributor and user account, and also member account
      await db.execute(
        `UPDATE contributors SET is_deleted=1, deleted_at=?, deletion_ip=?,
         deletion_method='UI', deletion_confirmation_method='OTP', status='deactivated'
         WHERE LOWER(email) = LOWER(?)`,
        [timestamp, ip, memberEmail]
      );
      await db.execute(
        `UPDATE users SET is_active=0, is_deleted=1, deleted_at=?, deletion_ip=?
         WHERE LOWER(email) = LOWER(?)`,
        [timestamp, ip, memberEmail]
      );
      await db.execute(
        `UPDATE members SET is_deleted=1, deleted_at=?, deletion_ip=?,
         deletion_method='UI', deletion_confirmation_method='OTP', status='deactivated'
         WHERE (id=? OR LOWER(email)=LOWER(?))`,
        [timestamp, ip, memberId || 0, memberEmail]
      );
      message = 'Your contributor and member accounts have been deactivated.';
    } else {
      // Regular member: deactivation
      await db.execute(
        `UPDATE members SET is_deleted=1, deleted_at=?, deletion_ip=?,
         deletion_method='UI', deletion_confirmation_method='OTP', status='deactivated'
         WHERE (id=? OR LOWER(email)=LOWER(?))`,
        [timestamp, ip, memberId || 0, memberEmail]
      );
      await db.execute(
        `UPDATE users SET is_active=0, is_deleted=1, deleted_at=?, deletion_ip=?
         WHERE LOWER(email)=LOWER(?)`,
        [timestamp, ip, memberEmail]
      );
      message = 'Your account has been deactivated.';
    }

    await db.commit();

    const MailService = require('../services/MailService');
    const NotificationService = require('../services/NotificationService');
    const notifier = new NotificationService(MailService.getInstance(db));
    notifier.notifyAccountDeleted(memberEmail, memberName).catch(() => {});

    req.session.destroy(() => {});
    return res.json({ status: 'success', message });
  } catch (err) {
    if (db.inTransaction) await db.rollback().catch(() => {});
    return res.status(err.message.includes('code') ? 400 : 500)
      .json({ status: 'error', message: err.message });
  }
});

// GET /api/content?slug=... — plaintext content for AI crawlers (?plaintext=1 redirect target)
router.get(['/content.php', '/content'], async (req, res) => {
  const db = req.db;
  const { slug, format } = req.query;
  if (!slug) return res.status(400).send('slug is required');

  try {
    const [rows] = await db.execute(
      `SELECT b.title, b.excerpt, b.content, b.date, b.category,
              CASE WHEN u.role = 'admin' OR b.author_id IS NULL OR b.author_id = 1 THEN 'Raghu Boddu'
                   ELSE COALESCE(c.full_name, b.author) END AS author_name
       FROM blogs b
       LEFT JOIN users u ON b.author_id = u.id
       LEFT JOIN contributors c ON u.contributor_id = c.id
       WHERE b.slug = ? AND b.status IN ('approved','published') LIMIT 1`,
      [slug]
    );
    if (!rows.length) return res.status(404).send('Not found');

    const b = rows[0];
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
});

// GET /api/sitemap.xml (also served at /sitemap.xml via index.js)
router.get(['/sitemap.php', '/sitemap.xml'], async (req, res) => {
  const db = req.db;
  try {
    // Always use the canonical production domain — never localhost
    const siteUrl = (process.env.CANONICAL_URL || 'https://sap.webanatomy.in').replace(/\/$/, '');
    const today = new Date().toISOString().slice(0, 10);

    const [blogs] = await db.execute(
      "SELECT slug, category, updated_at, date FROM blogs WHERE status IN ('approved','published') AND (type IS NULL OR type = 'blog') ORDER BY updated_at DESC"
    );

    const staticPages = [
      { loc: '/',                       priority: '1.0', changefreq: 'daily'   },
      { loc: '/blogs',                  priority: '0.9', changefreq: 'daily'   },
      { loc: '/about',                  priority: '0.7', changefreq: 'monthly' },
      { loc: '/contact-us',             priority: '0.6', changefreq: 'monthly' },
      { loc: '/podcasts',               priority: '0.7', changefreq: 'weekly'  },
      { loc: '/product-reviews',        priority: '0.7', changefreq: 'weekly'  },
      { loc: '/expert-recommendations', priority: '0.7', changefreq: 'weekly'  },
      { loc: '/become-a-contributor',   priority: '0.6', changefreq: 'monthly' },
      { loc: '/authors/raghu-boddu',    priority: '0.8', changefreq: 'monthly' },
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
});

// ── SEO Meta endpoint for Next.js generateMetadata ──────────────────────────
// GET /api/seo-meta?path=/articles/some-slug
const SEO_STATIC = {
  '/': {
    title: 'SAP Security, GRC & Cybersecurity Community - Tutorials & Best Practices | SAP Security Expert',
    description: 'Join 10,000+ SAP Security, GRC, and BTP professionals. Access expert tutorials, best practices, and guides to protect your SAP landscape and advance your career.',
  },
  '/blogs': { title: 'Blogs & Tutorials | SAP Security Expert', description: 'Read our latest blogs, tutorials, and step-by-step guides on SAP Security, GRC, and cloud compliance.' },
  '/about': { title: 'About Us | SAP Security Expert', description: 'Learn more about SAP Security Expert, our mission, and our team of enterprise security specialists.' },
  '/contact-us': { title: 'Contact SAP Security Expert', description: 'Contact SAP Security Expert for enquiries, partnerships, or support. Connect with SAP security professionals today.' },
  '/podcasts': { title: 'SAP Security Podcasts & Expert Insights | SAP Security Expert', description: 'Listen to SAP security podcasts for expert insights, industry trends, and strategies.' },
  '/reviews': { title: 'Product Reviews | SAP Security Expert', description: 'Unbiased reviews of the latest SAP Security and GRC compliance tools and automation platforms.' },
  '/expert-recommendations': { title: 'SAP Security Recommendations & Resources | SAP Security Expert', description: 'SAP security expert recommendations, utilities, and resources to improve protection and simplify GRC workflows.' },
  '/news': { title: 'News & Updates | SAP Security Expert', description: 'The latest announcements, feature releases, and platform news from SAP Security Expert — straight from the team.' },
  '/learning-hub': { title: 'SAP Security Learning Hub — Free Courses & Tutorials | SAP Security Expert', description: 'Learn SAP Security from scratch with structured modules covering fundamentals, user management, role design, GRC, and more. Free hands-on tutorials for all levels.' },
  '/become-a-contributor': { title: 'Write for SAP Security Expert | Become a Contributor', description: 'Share your SAP Security expertise. Join our contributor programme and publish guides, tutorials, and best practices to the SAP security community.' },
  '/authors/raghu-boddu': { title: 'Raghu Boddu - SAP Security & GRC Expert | SAP Security Expert', description: 'Read expert insights and research from Raghu Boddu, founder of SAP Security Expert.' },
};

const SEO_CATEGORIES = {
  'sap-btp-security': { title: 'SAP BTP Cloud Security Guide | SAP Security Expert', description: 'Secure SAP BTP with step-by-step tutorials on IAS/IPS, Role Collections, API security, and tenant hardening. Expert guides for cloud security professionals.' },
  'sap-grc': { title: 'SAP GRC Governance Risk Compliance | SAP Security Expert', description: 'Master SAP GRC with expert guides on ARA rulesets, ARM workflows, EAM firefighter logs, and BRM role governance. Practical compliance tutorials for GRC professionals.' },
  'sap-public-cloud': { title: 'SAP Public Cloud Security Guide | SAP Security Expert', description: 'Secure SAP S/4HANA Cloud Public Edition with tutorials on IAS/IPS IAM, business catalog permissions, and communication arrangements for cloud compliance.' },
  'sap-cybersecurity': { title: 'SAP Cybersecurity Resources & Insights | SAP Security Expert', description: 'Protect SAP environments from advanced threats. Learn ABAP code auditing, SIEM integration, infrastructure hardening, and vulnerability management best practices.' },
  'sap-iag': { title: 'SAP IAG Identity Access Governance | SAP Security Expert', description: 'Govern identities with SAP IAG. Learn SoD checks, intelligent access analysis, automated provisioning, and cloud-native risk management in hybrid environments.' },
  'sap-security': { title: 'SAP Security Services & Solutions | SAP Security Expert', description: 'Master SAP Security with step-by-step guides on role design (PFCG), authorization objects, SoD, audit strategies, and RFC/gateway hardening for enterprise systems.' },
  'sap-s4hana-security': { title: 'SAP S/4HANA Security Best Practices | SAP Security Expert', description: 'Secure SAP S/4HANA with expert tutorials on HANA DB permissions, business catalog mapping, role migration from ECC, and Fiori UX authorization design.' },
  'sap-fiori-security': { title: 'SAP Fiori Security & UX Protection | SAP Security Expert', description: 'Harden SAP Fiori with guides on catalog and spaces design, OData service security, Web Dispatcher hardening, and SSO configuration for secure UX delivery.' },
  'sap-sac-security': { title: 'SAP Analytics Cloud (SAC) Security | SAP Security Expert', description: 'Secure SAP Analytics Cloud: user provisioning, folder permissions, RLS data access, SSO via IAS, and governance best practices for secure enterprise reporting.' },
  'sap-cis': { title: 'SAP Cybersecurity Infrastructure (CIS) | SAP Security Expert', description: 'Harden SAP infrastructure with CIS benchmarks, HANA and OS security controls, Security Audit Log setup, and patch management frameworks for system-level protection.' },
  'sap-successfactors-security': { title: 'SAP SuccessFactors Security & RBP | SAP Security Expert', description: 'Secure HCM data with SAP SuccessFactors RBP. Learn permission groups, target populations, SSO via IAS, and GDPR-compliant data privacy configurations.' },
  'sap-access-control': { title: 'SAP GRC Access Control Expert Guide | SAP Security Expert', description: 'Master SAP GRC Access Control: ARA rulesets, ARM workflows, EAM firefighter logs, and BRM role design. Step-by-step tutorials for GRC professionals.' },
  'sap-process-control': { title: 'SAP GRC Process Control & Continuous Monitoring | SAP Security Expert', description: 'Automate SAP compliance with GRC Process Control. Learn continuous control monitoring (CCM), internal control testing, and audit-ready frameworks.' },
  'sap-security-other': { title: 'Advanced SAP Security Topics & Custom Developments | SAP Security Expert', description: 'Explore niche SAP security domains: ABAP code audits, interface security, legacy system hardening, and custom authorization object design guides.' },
};

const DEFAULT_META = {
  title: 'SAP Security, GRC & Cybersecurity Community - Tutorials & Best Practices | SAP Security Expert',
  description: 'Join 10,000+ SAP Security, GRC, and BTP professionals. Access expert tutorials, best practices, and guides to protect your SAP landscape and advance your career.',
};

router.get('/seo-meta', async (req, res) => {
  const db = req.db;
  const path = (req.query.path || '/').replace(/\?.*$/, '');
  const siteUrl = (process.env.CANONICAL_URL || 'https://sap.webanatomy.in').replace(/\/$/, '');

  res.setHeader('Cache-Control', 'public, max-age=300');

  // 1. Static page
  if (SEO_STATIC[path]) {
    return res.json({ status: 'success', ...SEO_STATIC[path], url: siteUrl + path });
  }

  // 2. Category page  e.g. /sap-grc
  const catKey = path.replace(/^\//, '').split('/')[0];
  if (SEO_CATEGORIES[catKey]) {
    return res.json({ status: 'success', ...SEO_CATEGORIES[catKey], url: siteUrl + path });
  }

  // 3. Blog/article page  e.g. /articles/slug  or  /sap-grc/slug
  const parts = path.replace(/^\//, '').split('/');
  if (parts.length >= 2) {
    const slug = parts[parts.length - 1];
    try {
      const [rows] = await db.execute(
        `SELECT b.title, b.meta_description, b.image, b.category,
                CASE WHEN u.role = 'admin' OR b.author_id IS NULL OR b.author_id = 1 THEN 'Raghu Boddu'
                     ELSE COALESCE(c.full_name, b.author) END AS author_name
         FROM blogs b
         LEFT JOIN users u ON b.author_id = u.id
         LEFT JOIN contributors c ON u.contributor_id = c.id
         WHERE b.slug = ? AND b.status IN ('approved','published') LIMIT 1`,
        [slug]
      );
      if (rows.length) {
        const b = rows[0];
        const desc = b.meta_description || DEFAULT_META.description;
        return res.json({
          status: 'success',
          title: `${b.title} | SAP Security Expert`,
          description: desc,
          image: b.image || null,
          author: b.author_name,
          url: siteUrl + path,
        });
      }
    } catch (_) {}
  }

  // 4. Default
  return res.json({ status: 'success', ...DEFAULT_META, url: siteUrl + path });
});

// ── News/Updates public endpoints ─────────────────────────────────────────────

// GET /api/learnings  — published learnings (optional ?category=<slug>)
router.get('/learnings', async (req, res) => {
  const db = req.db;
  const { category } = req.query;
  const nowUtc = new Date().toISOString().slice(0, 19).replace('T', ' ');
  try {
    const params = [nowUtc];
    let catClause = '';
    if (category) { catClause = 'AND b.category = ?'; params.push(category); }
    const [rows] = await db.execute(
      `SELECT id, title, slug, excerpt, image, image_alt, category, date, created_at, view_count,
              author, author_id,
              (SELECT COUNT(*) FROM comments c WHERE c.post_id = b.slug AND c.status = 'approved') AS comment_count
       FROM blogs b
       WHERE \`type\` = 'learning' AND status IN ('approved','published') AND date <= ?
       ${catClause}
       ORDER BY date DESC, created_at DESC`,
      params
    );
    return res.json(rows);
  } catch (err) {
    console.error('[GET /api/learnings]', err.message);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// GET /api/learnings/counts  — count of published learnings per module category
router.get('/learnings/counts', async (req, res) => {
  const db = req.db;
  const nowUtc = new Date().toISOString().slice(0, 19).replace('T', ' ');
  try {
    const [rows] = await db.execute(
      `SELECT category, COUNT(*) AS count
       FROM blogs
       WHERE \`type\` = 'learning' AND status IN ('approved','published') AND date <= ?
       GROUP BY category`,
      [nowUtc]
    );
    const counts = {};
    rows.forEach(r => { counts[r.category] = Number(r.count); });
    return res.json(counts);
  } catch (err) {
    console.error('[GET /api/learnings/counts]', err.message);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// GET /api/news  — list published news items
router.get('/news', async (req, res) => {
  const db = req.db;
  const nowUtc = new Date().toISOString().slice(0, 19).replace('T', ' ');
  try {
    const [rows] = await db.execute(
      `SELECT id, title, slug, excerpt, image, image_alt, date, created_at, view_count,
              meta_title, meta_description,
              (SELECT COUNT(*) FROM comments c WHERE c.post_id = b.slug AND c.status = 'approved') AS comment_count
       FROM blogs b
       WHERE \`type\` = 'news' AND status IN ('approved','published') AND date <= ?
       ORDER BY date DESC, created_at DESC`,
      [nowUtc]
    );
    return res.json(rows);
  } catch (err) {
    console.error('[GET /api/news]', err.message);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// GET /api/news/:slug  — single news item (used by DynamicBlog via the posts route too,
//                        but this dedicated endpoint ensures slug resolution even if the
//                        caller uses the /news/ prefix explicitly)
router.get('/news/:slug', async (req, res) => {
  const db = req.db;
  const { slug } = req.params;
  try {
    const [rows] = await db.execute(
      `SELECT b.*,
              (SELECT COUNT(*) FROM comments c WHERE c.post_id = b.slug AND c.status = 'approved') AS comment_count
       FROM blogs b
       WHERE (b.slug = ? OR b.id = ?) AND b.\`type\` = 'news' AND b.status IN ('approved','published')
       LIMIT 1`,
      [slug, slug]
    );
    if (!rows.length) return res.status(404).json({ error: 'News item not found' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('[GET /api/news/:slug]', err.message);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
