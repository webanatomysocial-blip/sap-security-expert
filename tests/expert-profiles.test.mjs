import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src = fs.readFileSync(new URL('../src/app/[category]/[slug]/page.jsx', import.meta.url), 'utf8');
const section = (startMarker, endMarker) => src.slice(src.indexOf(startMarker), src.indexOf(endMarker, src.indexOf(startMarker) + 1));
const fetchContributor = section('async function fetchContributor', 'async function fetchBlog');
const fetchAmbassador = section('async function fetchAmbassador', 'function expertiseItems');

test('profile fetches are anonymous: no internal SSR header, no cookies', () => {
  assert.match(fetchContributor, /\/api\/contributors\/profile\//);
  assert.match(fetchAmbassador, /\/api\/ambassadors\/profile\//);
  assert.doesNotMatch(fetchContributor, /X-SSR-Internal|REVALIDATE_SECRET|cookie/i);
  assert.doesNotMatch(fetchAmbassador, /X-SSR-Internal|REVALIDATE_SECRET|cookie/i);
});

test('ambassador page renders only public profile fields, never application answers or internal ids', () => {
  const branch = section("  if (category === 'ambassador') {\n    const amb = await fetchAmbassador(slug);\n    if (amb?.full_name) {", 'ProfileFallback');
  for (const forbidden of ['motivation', 'contribution_examples', 'user_id', 'email', 'phone', 'city', 'state', 'approved_at']) {
    assert.doesNotMatch(branch, new RegExp(`amb\\.${forbidden}\\b`), `must not render amb.${forbidden}`);
  }
  assert.match(branch, /amb\.full_name/);
  assert.match(branch, /amb\.about_me/);
});

test('contributor articles are only rendered from the public profile list and link to real routes', () => {
  const comp = section('function ProfileFallback', 'export default async function BlogPostPage');
  assert.match(comp, /<a href=\{`\/\$\{b\.category\}\/\$\{b\.slug\}`\}/);
  assert.match(comp, /<h1 style=\{\{ fontSize: '2\.25rem'[^}]*\}\}>\{name\}<\/h1>/);
  assert.doesNotMatch(comp, /b\.content|file_url|fileUrl|download_url/);
});

test('JSON-LD is a Person with only supported properties and escaped for script context', () => {
  const fn = section('function personJsonLd', 'async function fetchContributor');
  assert.match(fn, /'@type': 'Person'/);
  assert.match(fn, /replace\(\/<\/g, '\\\\u003c'\)/);
  for (const forbidden of ['email', 'telephone', 'address', 'aggregateRating', 'review']) {
    assert.doesNotMatch(fn, new RegExp(forbidden));
  }
});

test('only http(s) profile links are rendered', () => {
  const fn = section('function publicHttpUrl', 'function personJsonLd');
  assert.match(fn, /protocol === 'https:' \|\| u\.protocol === 'http:'/);
});

test('ambassador metadata is indexable only for a real approved profile', () => {
  assert.match(src, /robots: \{ index: !!amb\?\.full_name, follow: true \}/);
  assert.match(src, /const canonical = `\$\{SITE_URL\}\/ambassador\/\$\{encodeURIComponent\(slug\)\}`;/);
});
