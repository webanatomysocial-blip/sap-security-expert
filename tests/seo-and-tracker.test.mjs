import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { sanitizeBlogHtml, validateImageAltText } = require('../server/utils/sanitize');

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('server metadata fallbacks are HTTPS and restricted routes stay out of sitemap', () => {
  for (const file of ['src/app/layout.jsx', 'src/app/robots.js', 'src/app/sitemap.js', 'src/app/[[...slug]]/page.jsx']) {
    assert.doesNotMatch(read(file), /NEXT_PUBLIC_SITE_URL \|\| 'http:\/\/sapsecurityexpert\.com'/);
  }
  assert.match(read('src/app/[[...slug]]/page.jsx'), /const canonical = secureExternal/);
  const sitemap = read('src/app/sitemap.js');
  assert.doesNotMatch(sitemap, /url:\s*['"]\/(admin|member\/login|api|forgot-password|reset-password)/);
});

test('metadata blocks streaming and public profile fallbacks remain crawlable', () => {
  const config = read('next.config.js');
  const category = read('src/app/[category]/page.jsx');
  const profile = read('src/app/[category]/[slug]/page.jsx');
  assert.match(config, /htmlLimitedBots:\s*\/\.\*\//);
  assert.match(category, /SPA_PAGE_SUMMARIES/);
  assert.match(category, /dynamic = 'force-dynamic'/);
  assert.match(profile, /dynamic = 'force-dynamic'/);
  assert.match(profile, /enhanceArticleImages/);
  // Owner-approved visibility rules: no hard-coded name fallback. A hidden or
  // missing profile must not be named without the API's permission.
  assert.doesNotMatch(profile, /KNOWN_CONTRIBUTORS/);
  assert.match(profile, /<h1[\s\S]*?Raghu Boddu/);
});

test('informative editor images require meaningful alt text while decorative images remain explicit', () => {
  assert.equal(validateImageAltText(sanitizeBlogHtml('<img src="/uploads/blogs/x.jpg">')).length, 1);
  assert.equal(validateImageAltText(sanitizeBlogHtml('<img src="/uploads/blogs/x.jpg" alt="">')).length, 1);
  assert.equal(validateImageAltText(sanitizeBlogHtml('<img src="/uploads/blogs/x.jpg" alt="SAP access control dashboard">')).length, 0);
  assert.equal(validateImageAltText(sanitizeBlogHtml('<img src="/uploads/blogs/x.jpg" alt="" data-decorative="true">')).length, 0);
});

test('legal pages, complaint option and non-fabricated instructor state are wired', () => {
  const app = read('src/App.jsx');
  assert.match(app, /cookie-policy/);
  assert.match(app, /disclaimer/);
  assert.match(read('src/views/ContactUs.jsx'), /Complaint or service concern/);
  assert.match(read('src/views/LearningHub.jsx'), /Instructor profiles coming soon/);
  assert.doesNotMatch(read('src/views/LearningHub.jsx'), /Priya Rangarajan|Marcus Okonkwo|Sandra Köhler/);
});

test('email queue migration preserves rows while enabling full Unicode', () => {
  const sql = read('server/migrations/2026-11-10_email_queue_utf8mb4.mysql.sql');
  assert.match(sql, /ALTER TABLE email_queue/);
  assert.match(sql, /CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci/);
  assert.match(sql, /Preserve existing column types and nullability/);
  assert.match(sql, /Restore the independently[\s\S]*encrypted backup/);
  assert.doesNotMatch(sql, /\bMODIFY\b/i);
  assert.doesNotMatch(sql, /\b(DROP|DELETE|TRUNCATE)\b/i);
  for (const sample of ['Standard English', 'తెలుగు భద్రత', 'Security update 🔐', 'GRC & IAG — review']) {
    assert.equal(Buffer.from(sample, 'utf8').toString('utf8'), sample);
  }
});

test('email queue v2 stages preserve semantics and gate uniqueness at the target collation', () => {
  const stage1 = read('server/migrations/2026-11-10_email_queue_utf8mb4_v2.mysql.sql');
  const stage2 = read('server/migrations/2026-11-10_email_queue_utf8mb4_v2_add_unique.mysql.sql');
  assert.match(stage1, /STAGE 1 OF 2/);
  assert.match(stage1, /MODIFY subject VARCHAR\(500\)[\s\S]*NOT NULL/);
  assert.match(stage1, /MODIFY body LONGTEXT[\s\S]*NOT NULL/);
  assert.match(stage1, /MODIFY blog_id VARCHAR\(255\)[\s\S]*NULL/);
  assert.doesNotMatch(stage1, /ADD UNIQUE KEY/);
  assert.match(stage2, /STAGE 2 OF 2/);
  assert.match(stage2, /recipient COLLATE utf8mb4_unicode_ci/);
  assert.match(stage2, /blog_id COLLATE utf8mb4_unicode_ci/);
  assert.match(stage2, /ADD UNIQUE KEY uq_email_queue_recipient_blog/);
  assert.match(stage2, /DDL commits independently/);
  assert.match(stage2, /verified encrypted backup/);
  assert.doesNotMatch(`${stage1}\n${stage2}`, /\bDELETE\s+FROM\s+email_queue\b/i);
});

test('DEV Nginx proposal emits noindex explicitly in every location class', () => {
  const nginx = read('deploy/nginx.dev-secure-proposed.conf');
  assert.match(nginx, /merge template[\s\S]*installable file/);
  assert.match(nginx, /ssl_certificate and ssl_certificate_key/);
  assert.match(nginx, /location \^~ \/_next\/static\/[\s\S]*?add_header X-Robots-Tag/);
  assert.match(nginx, /location \^~ \/assets\/[\s\S]*?add_header X-Robots-Tag/);
  assert.match(nginx, /location ~ \^\/\(api\|admin\|member\|uploads\)[\s\S]*?add_header X-Robots-Tag/);
  assert.match(nginx, /location \^~ \/_next\/[\s\S]*?add_header X-Robots-Tag/);
  assert.match(nginx, /location \/ \{[\s\S]*?add_header X-Robots-Tag/);
  assert.match(nginx, /proxy_cache off/);
  assert.doesNotMatch(nginx, /proxy_ignore_headers Cache-Control/);
});

test('database pool remains configurable with a conservative default', () => {
  const db = read('server/db.js');
  assert.match(db, /DB_POOL_SIZE \|\| '8'/);
  assert.match(db, /waitForConnections:\s*true/);
  assert.match(db, /queueLimit:\s*200/);
});
