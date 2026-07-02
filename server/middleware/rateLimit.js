const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const cacheDir = path.join(__dirname, '../../cache');

/**
 * File-based IP rate limiter.
 * Only bypassed on localhost in non-production environments.
 * In production, ALL traffic is rate-limited (even requests forwarded from Apache on 127.0.0.1).
 */
function rateLimit(action, limit, windowSeconds) {
  return (req, res, next) => {
    // Only skip rate limiting in dev/test when the actual client is loopback
    const isProd = process.env.NODE_ENV === 'production';
    if (!isProd) {
      const host = req.hostname || '';
      if (host === 'localhost' || host === '127.0.0.1') return next();
    }

    const ip = req.ip || '0.0.0.0';

    if (!fs.existsSync(cacheDir)) {
      try { fs.mkdirSync(cacheDir, { recursive: true }); } catch { return next(); }
    }

    const cacheFile = path.join(cacheDir, `rl_${hash(action + '_' + ip)}.json`);
    const now = Math.floor(Date.now() / 1000);

    let window = [];
    if (fs.existsSync(cacheFile)) {
      try { window = JSON.parse(fs.readFileSync(cacheFile, 'utf8')); } catch { window = []; }
    }

    // Prune expired entries
    window = window.filter(ts => (now - ts) < windowSeconds);

    if (window.length >= limit) {
      return res.status(429).json({
        status: 'error',
        message: 'Too many requests. Please wait before trying again.',
      });
    }

    window.push(now);
    try { fs.writeFileSync(cacheFile, JSON.stringify(window)); } catch { /* skip */ }

    next();
  };
}

function hash(str) {
  return crypto.createHash('sha256').update(str).digest('hex').slice(0, 16);
}

module.exports = { rateLimit };
