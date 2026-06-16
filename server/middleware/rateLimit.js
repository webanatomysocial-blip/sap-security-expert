const fs = require('fs');
const path = require('path');

const cacheDir = path.join(__dirname, '../../cache');

/**
 * File-based IP rate limiter matching api/middleware/rate_limit.php.
 * Always bypassed on localhost.
 */
function rateLimit(action, limit, windowSeconds) {
  return (req, res, next) => {
    const host = req.hostname || '';
    if (host === 'localhost' || host === '127.0.0.1') return next();

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
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16);
}

module.exports = { rateLimit };
