#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { processImage, variantPath } = require('../services/ImageService');

const args = new Set(process.argv.slice(2));
const dryRun = !args.has('--apply');
const rootArg = process.argv.find((a) => a.startsWith('--root='));
const concurrencyArg = process.argv.find((a) => a.startsWith('--concurrency='));
const uploadRoot = path.resolve(rootArg ? rootArg.slice(7) : path.join(__dirname, '../../public/uploads'));
const concurrency = Math.max(1, Math.min(4, Number(concurrencyArg?.slice(14)) || 1));
const manifestPath = path.join(uploadRoot, 'image-variants-manifest.json');
const configuredReserve = Number(process.env.IMAGE_BACKFILL_MIN_FREE_BYTES);
const reserveBytes = Number.isFinite(configuredReserve) && configuredReserve >= 0
  ? configuredReserve
  : 100 * 1024 * 1024;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file, out);
    else if (/\.(jpe?g|png)$/i.test(entry.name) && !/-\d+\.webp$/i.test(entry.name)) out.push(file);
  }
  return out;
}

async function main() {
  const sources = walk(uploadRoot);
  const previous = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : { files: {} };
  const free = fs.statfsSync(uploadRoot).bavail * fs.statfsSync(uploadRoot).bsize;
  const sourceBytes = sources.reduce((n, file) => n + fs.statSync(file).size, 0);
  const estimatedBytes = Math.ceil(sourceBytes * 0.75);
  if (!dryRun && free < estimatedBytes + reserveBytes) {
    throw new Error(`Insufficient free disk space for variants plus ${reserveBytes} byte safety reserve.`);
  }

  const manifest = { version: 1, mode: dryRun ? 'dry-run' : 'apply', root: uploadRoot, generatedAt: new Date().toISOString(), files: previous.files || {} };
  let cursor = 0;
  async function worker() {
    while (cursor < sources.length) {
      const source = sources[cursor++];
      const key = path.relative(uploadRoot, source);
      if (!dryRun && manifest.files[key]?.status === 'complete') continue;
      const before = fs.statSync(source).size;
      try {
        if (dryRun) {
          manifest.files[key] = { source: key, sourceBytes: before, outputs: [400, 800, 1200].map((width) => path.relative(uploadRoot, variantPath(source, width))), status: 'planned' };
        } else {
          const isAvatar = /\/(avatars?|contributors?|members?)\//i.test(source);
          const result = await processImage(source, { widths: isAvatar ? [100] : [400, 800, 1200] });
          const outputs = result.outputs.map((item) => ({ path: path.relative(uploadRoot, item.path), width: item.actualWidth, height: item.height, bytes: fs.statSync(item.path).size, status: item.status }));
          manifest.files[key] = { source: key, sourceBytes: before, width: result.width, height: result.height, outputs, status: 'complete' };
          fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        }
      } catch (err) {
        manifest.files[key] = { source: key, sourceBytes: before, status: 'error', error: err.message };
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  const actualVariantBytes = Object.values(manifest.files).flatMap((f) => f.outputs || []).reduce((n, o) => n + (o.bytes || 0), 0);
  manifest.summary = { sources: sources.length, sourceBytes, estimatedVariantBytes: estimatedBytes, actualVariantBytes, freeBytes: free, reserveBytes, concurrency, host: os.hostname() };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify(manifest.summary));
  console.log(`[images] ${dryRun ? 'dry run' : 'apply'} complete; manifest: ${manifestPath}`);
}

main().catch((err) => { console.error('[images] failed:', err.message); process.exitCode = 1; });
