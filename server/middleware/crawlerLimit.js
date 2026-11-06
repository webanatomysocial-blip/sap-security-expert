// Rate-limits self-identified crawlers and scrapers before any database work happens.
// Ordinary browser traffic is never matched, so members and admins are unaffected.
// Limits are per client IP, using the same file-based limiter as the other endpoints.
const { rateLimit } = require('./rateLimit');

const CRAWLER_UA = /bot|crawl|spider|slurp|yandex|baidu|semrush|ahrefs|mj12|dotbot|petalbot|bytespider|gptbot|claudebot|facebookexternalhit|headlesschrome|python-requests|go-http-client|curl\//i;
const limiter = rateLimit('crawler', 90, 60); // 90 requests per minute per IP for crawlers

module.exports = function crawlerLimit(req, res, next) {
  if (!CRAWLER_UA.test(req.headers['user-agent'] || '')) return next();
  return limiter(req, res, next);
};
