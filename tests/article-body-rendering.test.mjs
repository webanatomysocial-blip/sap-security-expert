import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const article = read('src/app/[category]/[slug]/page.jsx');
const catchAll = read('src/app/[[...slug]]/page.jsx');

test('article fetches are anonymous: no internal SSR header, no cookies', () => {
  for (const src of [article, catchAll]) {
    assert.doesNotMatch(src, /X-SSR-Internal/);
    assert.doesNotMatch(src, /SSR_SECRET/);
  }
  const fetchBlog = article.slice(article.indexOf('async function fetchBlog'), article.indexOf('async function fetchBlog') + 500);
  assert.match(fetchBlog, /\/api\/posts\//);
  assert.doesNotMatch(fetchBlog, /headers:/);
});

test('article body comes from the public API, which applies paywall rules (no SSR bypass)', () => {
  const api = read('server/controllers/postsController.js');
  assert.match(api, /const hasPaywallBypass = isOwnBlog \|\| isInternalSSR;/);
  assert.match(api, /if \(\(!sess\.admin_logged_in && !isInternalSSR\) \|\| req\.query\.lite === '1'\) delete b\.content;/);
});

test('the SSR header is no longer sent by any frontend route', () => {
  const files = ['src/app/[category]/[slug]/page.jsx', 'src/app/[[...slug]]/page.jsx', 'src/app/[category]/page.jsx'];
  for (const f of files) assert.doesNotMatch(read(f), /x-ssr-internal|X-SSR-Internal/i, f);
});
