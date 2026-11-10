import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { responsiveImageProps, variantUrl } from '../src/utils/responsiveImage.js';

const require = createRequire(import.meta.url);
const sharp = require('../server/node_modules/sharp');
const { processImage, processUpload, variantPath } = require('../server/services/ImageService');

function tempDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'sse-images-')); }

test('creates 400/800/1200 WebP variants without overwriting original', async (t) => {
  const dir = tempDir(); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'hero.png');
  await sharp({ create: { width: 1400, height: 700, channels: 3, background: '#336699' } }).png().toFile(source);
  const original = fs.readFileSync(source);
  const result = await processImage(source);
  assert.deepEqual(result.outputs.map((o) => o.actualWidth), [400, 800, 1200]);
  assert.deepEqual(fs.readFileSync(source), original);
  for (const width of [400, 800, 1200]) assert.equal((await sharp(variantPath(source, width)).metadata()).format, 'webp');
});

test('small images are never enlarged', async (t) => {
  const dir = tempDir(); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'small.jpg');
  await sharp({ create: { width: 180, height: 90, channels: 3, background: '#fff' } }).jpeg().toFile(source);
  const result = await processImage(source);
  assert.ok(result.outputs.every((o) => o.actualWidth === 180));
});

test('EXIF orientation is applied before resize', async (t) => {
  const dir = tempDir(); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'oriented.jpg');
  await sharp({ create: { width: 80, height: 160, channels: 3, background: '#cc0000' } }).jpeg().withMetadata({ orientation: 6 }).toFile(source);
  await processImage(source, { widths: [100] });
  const meta = await sharp(variantPath(source, 100)).metadata();
  assert.equal(meta.width, 100);
  assert.equal(meta.height, 50);
});

test('avatar processing makes a 100px variant', async (t) => {
  const dir = tempDir(); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'avatar.webp');
  await sharp({ create: { width: 300, height: 400, channels: 3, background: '#00aa00' } }).webp().toFile(source);
  const result = await processUpload(source, 'avatar');
  assert.deepEqual(result.outputs.map((o) => o.actualWidth), [100]);
});

test('invalid content fails safely and creates no variants', async (t) => {
  const dir = tempDir(); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'bad.png');
  fs.writeFileSync(source, 'not an image');
  await assert.rejects(processImage(source));
  assert.equal(fs.existsSync(variantPath(source, 400)), false);
});

test('responsive URLs and missing-variant fallback preserve original src', () => {
  assert.equal(variantUrl('/uploads/blogs/a.jpg', 400), '/uploads/blogs/a-400.webp');
  assert.equal(variantUrl('/private/a.jpg', 400), null);
  const props = responsiveImageProps('/uploads/blogs/a.jpg');
  const attrs = new Map([['srcset', props.srcSet], ['sizes', props.sizes]]);
  props.onError({ currentTarget: { removeAttribute: (name) => attrs.delete(name) } });
  assert.equal(attrs.has('srcset'), false);
  assert.equal(attrs.has('sizes'), false);
});
