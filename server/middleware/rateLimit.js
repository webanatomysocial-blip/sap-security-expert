const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');

const cacheDir = path.join(__dirname, '../../cache');

// In-memory per-key lock. The read-modify-write below is async (non-blocking
// fs calls), which — unlike the previous synchronous implementation — can
// yield to the event loop between the read and the write. Without this lock,
// two requests hitting the same action+IP in the same tick could both read
// the same window, both see room under the limit, and both get admitted.
// This Map serializes only same-key operations; unrelated keys never block
// each other. Safe for this app's single-process PM2 deployment (fork mode,
// instances: 1 — see ecosystem.config.cjs); would need a shared store
// (Redis) instead of this Map if ever run with multiple processes/instances.
const locks = new Map();

async function withLock(key, fn) {
  const prior = locks.get(key) || Promise.resolve();
  let release;
  const current = new Promise((resolve) => { release = resolve; });
  locks.set(key, prior.then(() => current));
  await prior;
  try {
    return await fn();
  } finally {
    release();
    if (locks.get(key) === current) locks.delete(key); // avoid unbounded Map growth
  }
}

/**
 * File-based IP rate limiter.
 * Only bypassed on localhost in non-production environments.
 * In production, ALL traffic is rate-limited (even requests forwarded from Apache on 127.0.0.1).
 */
function rateLimit(action, limit, windowSeconds) {
  return async (req, res, next) => {
    // Only skip rate limiting in dev/test when the actual client is loopback
    const isProd = process.env.NODE_ENV === 'production';
    if (!isProd) {
      const host = req.hostname || '';
      if (host === 'localhost' || host === '127.0.0.1') return next();
    }

    const ip = req.ip || '0.0.0.0';
    const key = hash(action + '_' + ip);

    try {
      if (!fs.existsSync(cacheDir)) {
        await fsp.mkdir(cacheDir, { recursive: true });
      }

      const cacheFile = path.join(cacheDir, `rl_${key}.json`);
      const now = Math.floor(Date.now() / 1000);

      const limited = await withLock(key, async () => {
        let window = [];
        try {
          window = JSON.parse(await fsp.readFile(cacheFile, 'utf8'));
        } catch { window = []; } // missing file or corrupt JSON — start fresh

        window = window.filter((ts) => now - ts < windowSeconds);

        if (window.length >= limit) return true;

        window.push(now);
        await fsp.writeFile(cacheFile, JSON.stringify(window));
        return false;
      });

      if (limited) {
        return res.status(429).json({
          status: 'error',
          message: 'Too many requests. Please wait before trying again.',
        });
      }

      next();
    } catch {
      // Disk error, permissions issue, etc. — fail open rather than take the
      // whole endpoint down; matches the previous implementation's behavior.
      next();
    }
  };
}

function hash(str) {
  return crypto.createHash('sha256').update(str).digest('hex').slice(0, 16);
}

// ── Stale file cleanup ──────────────────────────────────────────────────────
// Every rate-limit window this app configures maxes out at 3600s (1 hour —
// see the linkedin_bonus/profile_bonus/report_error/product_review routes in
// payments.js). A cache file is safe to delete once it's older than that,
// since its contents would all be pruned as expired on next read anyway —
// this just reclaims the disk space instead of leaving the file behind.
const MAX_WINDOW_SECONDS = 3600;
const STALE_AGE_MS = (MAX_WINDOW_SECONDS + 300) * 1000; // +5min safety margin
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // every 30 minutes

async function cleanupStaleFiles() {
  try {
    const files = await fsp.readdir(cacheDir);
    const now = Date.now();
    await Promise.all(
      files
        .filter((f) => f.startsWith('rl_') && f.endsWith('.json'))
        .map(async (f) => {
          const filePath = path.join(cacheDir, f);
          try {
            const stat = await fsp.stat(filePath);
            if (now - stat.mtimeMs > STALE_AGE_MS) await fsp.unlink(filePath);
          } catch { /* file removed by another process between readdir and stat — ignore */ }
        })
    );
  } catch { /* cacheDir doesn't exist yet — nothing to clean */ }
}

// .unref() so this interval never keeps the process alive on its own (doesn't
// interfere with graceful shutdown or short-lived scripts that require this
// module without ever starting a real server).
setInterval(cleanupStaleFiles, CLEANUP_INTERVAL_MS).unref();

module.exports = { rateLimit, cleanupStaleFiles };
