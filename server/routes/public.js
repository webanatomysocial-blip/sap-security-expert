/**
 * Public / miscellaneous read-only endpoints.
 */
const router = require('express').Router();
const { rateLimit } = require('../middleware/rateLimit');
const { requireMemberAuth, requireCsrf } = require('../middleware/auth');
const controller = require('../controllers/publicController');

// GET /api/homepage
router.get('/homepage', controller.homepage);

// GET /api/popular-tags
router.get('/popular-tags', controller.popularTags);

// GET /api/search?q=... — header search popup
router.get('/search', rateLimit('site_search', 60, 60), controller.search);

// GET /api/contributors/leaderboard
router.get('/contributors/leaderboard', controller.leaderboard);

// GET /api/members/:id/public — public member profile
router.get('/members/:id/public', controller.publicMemberProfile);

// GET /api/members/directory — public community directory
router.get('/members/directory', controller.memberDirectory);

// GET /api/community/countries — member counts per country
router.get('/community/countries', controller.communityCountries);

// GET /api/stats/community
router.get('/stats/community', controller.communityStats);

// GET /api/categories
router.get('/categories', controller.categories);

// GET /api/trending
router.get('/trending', controller.trendingTopics);

// GET /api/announcements-public
router.get('/announcements-public', controller.announcementsPublic);
router.get('/announcements-public/:slug', controller.announcementPublicBySlug);

// GET /api/admin/authors
router.get('/admin/authors', controller.authors);

// POST /api/views
router.post('/views', rateLimit('post_view', 60, 60), controller.recordView);

// GET /api/captcha
router.get('/captcha', controller.captcha);

// POST /api/delete-account
router.post('/delete-account', requireMemberAuth, requireCsrf, controller.deleteAccount);

// POST /api/send-mail — Contact Us form
router.post('/send-mail', rateLimit('contact_form', 5, 3600), controller.sendMail);

// GET /api/content?slug=... — plaintext content for AI crawlers
router.get('/content', controller.content);

// GET /api/sitemap.xml (also served at /sitemap.xml via index.js)
router.get('/sitemap.xml', controller.sitemap);

// GET /api/posts-sitemap (lightweight posts listing for sitemap generation)
router.get('/posts-sitemap', controller.postsSitemap);

// GET /api/seo-meta?path=/articles/some-slug
router.get('/seo-meta', controller.seoMeta);

// GET /api/learnings  — published learnings (optional ?category=<slug>)
router.get('/learnings', controller.learnings);

// GET /api/learnings/counts  — count of published learnings per module category
router.get('/learnings/counts', controller.learningsCounts);

// GET /api/news  — list published news items
router.get('/news', controller.news);

// GET /api/news/:slug
router.get('/news/:slug', controller.newsBySlug);

// GET /api/version — current app version (latest from CHANGELOG.md or DB)
router.get('/version', controller.appVersion);

// GET /api/geoip — IP geolocation proxy
router.get('/geoip', controller.geoip);

module.exports = router;
