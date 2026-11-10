#!/usr/bin/env node
'use strict';

// Backfill WebP variants for existing blog and ad images (JPEG/PNG originals only).
//
// Usage:
//   node scripts/backfill-image-variants.js --root=<uploads dir>            dry run, writes NOTHING
//   node scripts/backfill-image-variants.js --root=<uploads dir> --apply    creates variants
//
// Scope: only the folders the frontend requests variants for (blogs, ads). See
// src/utils/responsiveImage.js variantUrl and ImageService.publicVariantUrl.
// Originals are never written, moved or deleted.

const fs = require('fs');
const path = require('path');
const os = require('os');
const { processImage, variantPath, isValidVariant, DEFAULT_WIDTHS } = require('../services/ImageService');

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const argValue = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};

const uploadRoot = path.resolve(argValue('root') || path.join(__dirname, '../../public/uploads'));
const scopeDirs = (argValue('dirs') || 'blogs,ads').split(',').map((s) => s.trim()).filter(Boolean);
const manifestPath = path.resolve(argValue('manifest') || path.join(__dirname, '../logs/image-backfill-manifest.json'));
const requestedConcurrency = Number(argValue('concurrency') || 1);
const reserveBytes = Number.isFinite(Number(process.env.IMAGE_BACKFILL_MIN_FREE_BYTES)) && process.env.IMAGE_BACKFILL_MIN_FREE_BYTES !== ''
  ? Number(process.env.IMAGE_BACKFILL_MIN_FREE_BYTES)
  : 100 * 1024 * 1024;

// Concurrency is fixed at 1: the production host has about 1 GB RAM with swap in use.
if (requestedConcurrency !== 1) {
  console.error('[images] --concurrency must be 1 on this host.');
  process.exit(2);
}
// The manifest must not live inside the uploads tree, or the public static server could expose it.
if (manifestPath.startsWith(uploadRoot + path.sep)) {
  console.error('[images] --manifest must be outside the uploads folder.');
  process.exit(2);
}

const log = (msg) => console.log(`[images] ${msg}`);

// Memory guard. On Linux, MemAvailable is what matters (os.freemem ignores reclaimable cache).
const minAvailableMb = Number(process.env.IMAGE_BACKFILL_MIN_AVAILABLE_MB) > 0 ? Number(process.env.IMAGE_BACKFILL_MIN_AVAILABLE_MB) : 120;
// Off-Linux there is no MemAvailable, and os.freemem() badly understates usable memory on macOS.
// The guard is therefore disabled there rather than tripping on a wrong number.
function availableMemoryBytes() {
  try {
    const m = /^MemAvailable:\s+(\d+)\s+kB/m.exec(fs.readFileSync('/proc/meminfo', 'utf8'));
    if (m) return Number(m[1]) * 1024;
  } catch { /* not Linux */ }
  return Infinity;
}
const toRel = (file) => path.relative(uploadRoot, file).split(path.sep).join('/');

// One width rule for both dry run and apply, so the plan matches what gets written.
// Only blogs/ads are served as variants; the frontend never requests others.
function widthsFor() {
  return [...DEFAULT_WIDTHS];
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file, out);
    else if (/\.(jpe?g|png)$/i.test(entry.name)) out.push(file);
  }
  return out;
}

function listSources() {
  const files = [];
  for (const d of scopeDirs) walk(path.join(uploadRoot, d), files);
  return files.sort();
}

function freeBytes() {
  const s = fs.statfsSync(uploadRoot);
  return s.bavail * s.bsize;
}

function saveManifest(manifest) {
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true, mode: 0o700 });
  const tmp = `${manifestPath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(manifest, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, manifestPath);
}

// A file is skipped only if it completed AND every output is still a readable WebP of the expected width.
async function outputsValid(entry) {
  if (!entry || entry.status !== 'complete' || !Array.isArray(entry.outputs) || entry.outputs.length === 0) return false;
  for (const o of entry.outputs) {
    if (!(await isValidVariant(path.join(uploadRoot, o.path), o.width))) return false;
  }
  return true;
}

async function main() {
  const sources = listSources();
  const widths = widthsFor();
  const plannedVariants = sources.length * widths.length;
  const sourceBytes = sources.reduce((n, f) => n + fs.statSync(f).size, 0);
  const free = freeBytes();

  if (!apply) {
    // Dry run: read-only. Prints the plan and writes no files anywhere.
    const sample = sources.slice(0, 3).map((f) => ({ source: toRel(f), outputs: widths.map((w) => toRel(variantPath(f, w))) }));
    console.log(JSON.stringify({
      mode: 'dry-run',
      root: uploadRoot,
      scope: scopeDirs,
      sources: sources.length,
      plannedVariants,
      sourceBytes,
      freeBytes: free,
      reserveBytes,
      sample,
      manifest: 'not written in dry run',
    }, null, 2));
    log('dry run complete; no files were written.');
    return;
  }

  if (free < reserveBytes + sourceBytes) {
    throw new Error(`Insufficient free disk for the whole run: need about ${sourceBytes + reserveBytes} bytes, have ${free}.`);
  }

  const previous = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : { files: {} };
  const manifest = {
    version: 2,
    mode: 'apply',
    root: uploadRoot,
    scope: scopeDirs,
    startedAt: new Date().toISOString(),
    widths,
    files: previous.files || {},
  };
  const counts = { complete: 0, skipped_valid: 0, error: 0 };
  let processed = 0;

  for (const source of sources) {
    const key = toRel(source);
    const before = fs.statSync(source).size;

    // Skip a file only when its previous run completed and every listed output still exists.
    if (await outputsValid(manifest.files[key])) {
      counts.skipped_valid += 1;
      continue;
    }

    // Memory guard: stop before the host starts swapping. Completed files are kept and the run is retry-safe.
    if (availableMemoryBytes() < minAvailableMb * 1024 * 1024) {
      saveManifest(manifest);
      throw new Error(`Stopped: available memory below ${minAvailableMb} MB. Re-run later; completed files are kept.`);
    }

    // Per-file disk check: stop before running out of space, not after.
    if (freeBytes() < reserveBytes + before) {
      manifest.files[key] = { source: key, sourceBytes: before, status: 'error', error: 'stopped: free disk below reserve' };
      counts.error += 1;
      saveManifest(manifest);
      throw new Error('Stopped: free disk below reserve. Re-run after freeing space; completed files are kept.');
    }

    try {
      const result = await processImage(source, { widths });
      const outputs = result.outputs.map((item) => ({
        path: toRel(item.path),
        width: item.width,
        actualWidth: item.actualWidth,
        height: item.height,
        bytes: fs.statSync(item.path).size,
        status: item.status,
      }));
      // Guard: the original must be untouched and every output must be a new WebP beside it.
      for (const o of outputs) {
        if (!o.path.endsWith('.webp') || path.join(uploadRoot, o.path) === source) throw new Error(`unsafe output path ${o.path}`);
      }
      manifest.files[key] = { source: key, sourceBytes: before, width: result.width, height: result.height, outputs, status: 'complete' };
      counts.complete += 1;
    } catch (err) {
      manifest.files[key] = { source: key, sourceBytes: before, status: 'error', error: err.message };
      counts.error += 1;
      console.error(`[images] FAILED ${key}: ${err.message}`);
    }

    processed += 1;
    saveManifest(manifest);
    if (processed % 25 === 0) {
      const m = process.memoryUsage();
      log(`progress ${processed}/${sources.length}; rss ${Math.round(m.rss / 1048576)} MB; free disk ${Math.round(freeBytes() / 1048576)} MB; mem available ${Math.round(availableMemoryBytes() / 1048576)} MB`);
    }
  }

  const variantBytes = Object.values(manifest.files).flatMap((f) => f.outputs || []).reduce((n, o) => n + (o.bytes || 0), 0);
  manifest.finishedAt = new Date().toISOString();
  manifest.summary = { sources: sources.length, plannedVariants, counts, variantBytes, sourceBytes, freeBytesAtEnd: freeBytes(), host: os.hostname() };
  saveManifest(manifest);
  console.log(JSON.stringify(manifest.summary, null, 2));
  log(`apply finished; manifest: ${manifestPath}`);
  if (counts.error > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('[images] failed:', err.message);
  process.exitCode = 1;
});
