import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { verifyImageMagicBytes } = require('../server/utils/helpers');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X1WnigAAAABJRU5ErkJggg==', 'base64');

function validate(file, filename) {
  return new Promise((resolve) => {
    const req = { file: { path: file, filename } };
    const res = { json: (body) => resolve({ rejected: true, body }) };
    verifyImageMagicBytes(req, res, () => resolve({ rejected: false }));
  });
}

test('upload validation accepts a matching detected format and stored extension', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'upload-magic-'));
  const file = path.join(dir, 'image.png');
  fs.writeFileSync(file, png);
  const result = await validate(file, 'image.png');
  assert.equal(result.rejected, false);
  assert.equal(fs.existsSync(file), true);
});

test('upload validation rejects and deletes a format/extension mismatch', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'upload-magic-'));
  const file = path.join(dir, 'spoofed.jpg');
  fs.writeFileSync(file, png);
  const result = await validate(file, 'spoofed.jpg');
  assert.equal(result.rejected, true);
  assert.match(result.body.message, /valid image/i);
  assert.equal(fs.existsSync(file), false);
});
