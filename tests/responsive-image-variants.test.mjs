import test from 'node:test';
import assert from 'node:assert/strict';
import { variantUrl, responsiveImageProps } from '../src/utils/responsiveImage.js';

test('JPEG and PNG blog originals get WebP variant URLs', () => {
  assert.equal(variantUrl('/uploads/blogs/blog_1.png', 800), '/uploads/blogs/blog_1-800.webp');
  assert.ok(responsiveImageProps('/uploads/blogs/blog_1.jpg').srcSet.includes('/uploads/blogs/blog_1-400.webp 400w'));
});

test('WebP originals get variants, but generated variants do not', () => {
  assert.equal(variantUrl('/uploads/blogs/blog_ab73a993f4481612.webp', 800), '/uploads/blogs/blog_ab73a993f4481612-800.webp');
  assert.equal(variantUrl('/uploads/blogs/blog_ab73a993f4481612-800.webp', 400), null);
  assert.deepEqual(responsiveImageProps('/uploads/blogs/blog_ab73a993f4481612-800.webp'), {});
});

test('non-upload and external sources are unchanged', () => {
  assert.equal(variantUrl('https://example.com/a.png', 800), null);
  assert.equal(variantUrl('/assets/logo.png', 800), null);
});
