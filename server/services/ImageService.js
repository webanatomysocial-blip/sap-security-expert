'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const DEFAULT_WIDTHS = [400, 800, 1200];
const DEFAULT_QUALITY = 80;
const MAX_PIXELS = 40000000;

// Keep memory predictable on the 1 GB deployment target. Both values may be
// raised explicitly for a larger development machine or an offline backfill.
sharp.concurrency(Math.max(1, Number(process.env.SHARP_CONCURRENCY) || 1));
sharp.cache({ memory: Math.max(0, Number(process.env.SHARP_CACHE_MB) || 0), files: 0, items: 0 });

function variantPath(source, width) {
  const parsed = path.parse(source);
  return path.join(parsed.dir, `${parsed.name}-${width}.webp`);
}

function publicVariantUrl(sourceUrl, width) {
  if (typeof sourceUrl !== 'string' || !/^\/uploads\/(blogs|ads)\//.test(sourceUrl)) return null;
  const parsed = path.posix.parse(sourceUrl);
  return path.posix.join(parsed.dir, `${parsed.name}-${width}.webp`);
}

async function inspectImage(source) {
  const metadata = await sharp(source, { failOn: 'error', limitInputPixels: MAX_PIXELS }).metadata();
  if (!['jpeg', 'png', 'webp'].includes(metadata.format) || !metadata.width || !metadata.height) {
    throw new Error('Unsupported or corrupt image. Use JPEG, PNG, or WebP.');
  }
  return metadata;
}

// An existing variant counts only if it is a readable, non-empty WebP no wider than requested.
// Anything else (empty, truncated, or wrong format) is regenerated.
async function isValidVariant(file, requestedWidth) {
  try {
    const st = await fs.promises.stat(file);
    if (st.size === 0) return false;
    const meta = await sharp(file).metadata();
    return meta.format === 'webp' && meta.width > 0 && meta.width <= requestedWidth;
  } catch {
    return false;
  }
}

async function processImage(source, options = {}) {
  const widths = [...new Set(options.widths || DEFAULT_WIDTHS)].filter((n) => Number.isInteger(n) && n > 0);
  const quality = Math.min(95, Math.max(40, Number(options.quality || process.env.IMAGE_WEBP_QUALITY || DEFAULT_QUALITY)));
  const overwrite = options.overwrite === true;
  const metadata = await inspectImage(source);
  const outputs = [];

  for (const requestedWidth of widths) {
    // Let Sharp evaluate `withoutEnlargement` after EXIF rotation. Raw metadata
    // width can describe the unrotated pixel matrix and would under-size a
    // portrait whose orientation swaps width and height.
    const width = requestedWidth;
    const output = variantPath(source, requestedWidth);
    if (!overwrite && await isValidVariant(output, requestedWidth)) {
      const existingMeta = await sharp(output).metadata();
      outputs.push({ width: requestedWidth, actualWidth: existingMeta.width, height: existingMeta.height, path: output, status: 'existing' });
      continue;
    }
    // Write under a temporary name, then rename. An interrupted run never leaves a
    // partial file at the final path, so a retry cannot mistake it for a valid variant.
    const tmp = output.replace(/\.webp$/, `.partial-${process.pid}.webp`);
    try {
      await sharp(source, { failOn: 'error', limitInputPixels: MAX_PIXELS })
        .rotate()
        .resize({ width, withoutEnlargement: true, fit: 'inside' })
        .webp({ quality, effort: 4 })
        .toFile(tmp);
      await fs.promises.rename(tmp, output);
    } catch (err) {
      await fs.promises.unlink(tmp).catch(() => {});
      throw err;
    }
    const outMeta = await sharp(output).metadata();
    outputs.push({ width: requestedWidth, actualWidth: outMeta.width, height: outMeta.height, path: output, status: 'created' });
  }
  return { source, format: metadata.format, width: metadata.width, height: metadata.height, outputs };
}

async function processUpload(source, kind = 'content') {
  return processImage(source, { widths: kind === 'avatar' ? [100] : DEFAULT_WIDTHS });
}

async function createAvatarVariant(req, _res, next) {
  if (!req.file?.path) return next();
  try {
    const result = await processUpload(req.file.path, 'avatar');
    req.imageVariants = result.outputs;
  } catch (err) {
    // Compatibility first: a valid original upload must remain usable even if
    // an old GIF or an optimization failure cannot produce a WebP avatar.
    console.warn('[image] avatar variant unavailable:', err.message);
  }
  return next();
}

module.exports = { DEFAULT_WIDTHS, createAvatarVariant, inspectImage, isValidVariant, processImage, processUpload, publicVariantUrl, variantPath };
