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
