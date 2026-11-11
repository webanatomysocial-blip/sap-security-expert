import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src = fs.readFileSync(new URL('../src/app/[category]/page.jsx', import.meta.url), 'utf8');
const fetcher = src.slice(src.indexOf('async function fetchPublicListing'), src.indexOf('async function fetchSeoMeta'));

test('server listing fetch is anonymous: no cookies and no internal SSR bypass header', () => {
  assert.match(fetcher, /fetch\(/);
  assert.doesNotMatch(fetcher, /x-ssr-internal|REVALIDATE_SECRET|cookie/i);
});

test('blogs and expert-papers render an H1 and linked cards in initial HTML', () => {
  assert.match(src, /category === 'blogs'/);
  assert.match(src, /category === 'expert-papers'/);
  assert.match(src, /<h1 style=\{\{ fontSize: '2\.25rem'[^}]*\}\}>\{title\}<\/h1>/);
  assert.match(src, /<a href=\{`\/\$\{b\.category\}\/\$\{b\.slug\}`\}/);
});

test('listing only shows published items and keeps the client app for interactivity', () => {
  assert.match(src, /\['approved', 'published'\]\.includes\(b\.status\)/);
  assert.match(src, /<ListingFallback[\s\S]*?\/>\s*<ClientApp \/>/);
});

test('the server H1 for /blogs matches the client H1 so the title does not change on hydration', () => {
  assert.match(src, /title="All Blogs & Articles"/);
});

test('stage 2: downloads and learning-hub use anonymous public fetches only', () => {
  const pub = src.slice(src.indexOf('async function fetchPublicJson'), src.indexOf('async function fetchSeoMeta'));
  assert.match(pub, /fetch\(`\$\{INTERNAL_API\}\$\{pathWithQuery\}`/);
  assert.doesNotMatch(pub, /x-ssr-internal|REVALIDATE_SECRET|cookie/i);
  assert.match(src, /fetchPublicJson\(`\/api\/learnings\?limit=\$\{PAGE_SIZE \+ 1\}&offset=/);
  assert.match(src, /fetchPublicJson\('\/api\/learnings\/counts'\)/);
});

test('stage 2: downloads and learning-hub render H1, real links and publication filters', () => {
  assert.match(src, /category === 'downloads'/);
  assert.match(src, /category === 'learning-hub'/);
  assert.match(src, /<a href=\{`\/learning\/\$\{b\.category\}\/\$\{b\.slug\}`\}/);
  assert.match(src, /<a href=\{`\/learning\/\$\{m\.slug\}`\}/);
  assert.match(src, /\['approved', 'published'\]\.includes\(b\.status\)/);
});

test('stage 2: listing cards never expose file URLs or storage paths', () => {
  const comps = src.slice(src.indexOf('function LearningHubFallback'), src.indexOf('// ── Page (Server Component)'));
  assert.doesNotMatch(comps, /file_url|fileUrl|storage|\/private|download_url/);
});

test('stage 2: server H1 text matches the client heading on /downloads and /learning-hub', () => {
  assert.match(src, /title=\{summary\.title\.toUpperCase\(\)\}/);
  assert.match(src, /title="Learn SAP Security\. The way practitioners do\."/);
});

test('stage 2 closeout: learning-hub links only modules with published articles, as the client does', () => {
  const client = fs.readFileSync(new URL('../src/views/LearningHub.jsx', import.meta.url), 'utf8');
  assert.match(client, /const isAvailable = liveCount > 0;/);
  assert.match(client, /\{isAvailable && \(\s*<Link to=\{`\/learning\/\$\{m\.slug\}`\}/);
  assert.match(src, /\{m\.count > 0 \? \(/);
  assert.match(src, /Coming soon/);
});

