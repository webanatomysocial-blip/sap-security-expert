/**
 * Public / miscellaneous read-only endpoints.
 */
const router = require('express').Router();
const { rateLimit } = require('../middleware/rateLimit');
const controller = require('../controllers/publicController');

// GET /api/get_homepage_data.php
router.get(['/get_homepage_data.php', '/homepage'], controller.homepage);

// GET /api/popular-tags
router.get('/popular-tags', controller.popularTags);

// GET /api/contributors/leaderboard
router.get('/contributors/leaderboard', controller.leaderboard);

// GET /api/members/:id/public — public member profile
router.get('/members/:id/public', controller.publicMemberProfile);

// GET /api/stats/community  or  GET /api/get_community_stats.php
router.get(['/stats/community', '/get_community_stats.php'], controller.communityStats);

// GET /api/get_categories.php
router.get(['/get_categories.php', '/categories'], controller.categories);

// GET /api/get_trending_topics.php
router.get(['/get_trending_topics.php', '/trending'], controller.trendingTopics);

// GET /api/get_announcements.php
router.get(['/get_announcements.php', '/announcements-public'], controller.announcementsPublic);

// GET /api/get_authors.php  or  GET /api/admin/authors
router.get(['/get_authors.php', '/admin/authors'], controller.authors);

// POST /api/views  or  POST /api/save_view.php
router.post(['/views', '/save_view.php'], rateLimit('post_view', 60, 60), controller.recordView);

// GET /api/get_captcha.php
router.get(['/get_captcha.php', '/captcha'], controller.captcha);

// POST /api/delete_account.php
router.post(['/delete_account.php', '/delete-account'], controller.deleteAccount);

// GET /api/content?slug=... — plaintext content for AI crawlers
router.get(['/content.php', '/content'], controller.content);

// GET /api/sitemap.xml (also served at /sitemap.xml via index.js)
router.get(['/sitemap.php', '/sitemap.xml'], controller.sitemap);

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

module.exports = router;
