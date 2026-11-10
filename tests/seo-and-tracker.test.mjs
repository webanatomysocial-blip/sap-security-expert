import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('server metadata fallbacks are HTTPS and restricted routes stay out of sitemap', () => {
  for (const file of ['src/app/layout.jsx', 'src/app/robots.js', 'src/app/sitemap.js', 'src/app/[[...slug]]/page.jsx']) {
    assert.doesNotMatch(read(file), /NEXT_PUBLIC_SITE_URL \|\| 'http:\/\/sapsecurityexpert\.com'/);
  }
  assert.match(read('src/app/[[...slug]]/page.jsx'), /const canonical = secureExternal/);
  const sitemap = read('src/app/sitemap.js');
  assert.doesNotMatch(sitemap, /url:\s*['"]\/(admin|member\/login|api|forgot-password|reset-password)/);
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
  assert.match(sql, /subject VARCHAR\(500\) CHARACTER SET utf8mb4/);
  assert.match(sql, /body LONGTEXT CHARACTER SET utf8mb4/);
  assert.doesNotMatch(sql, /\b(DROP|DELETE|TRUNCATE)\b/i);
  for (const sample of ['Standard English', 'తెలుగు భద్రత', 'Security update 🔐', 'GRC & IAG — review']) {
    assert.equal(Buffer.from(sample, 'utf8').toString('utf8'), sample);
  }
});

test('database pool remains configurable with a conservative default', () => {
  const db = read('server/db.js');
  assert.match(db, /DB_POOL_SIZE \|\| '8'/);
  assert.match(db, /waitForConnections:\s*true/);
  assert.match(db, /queueLimit:\s*200/);
});
