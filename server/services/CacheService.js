const fs = require('fs');
const path = require('path');

/**
 * File-based cache with atomic writes.
 * Mirrors api/services/CacheService.php.
 */
class CacheService {
  constructor(ttl = 3600) {
    this.ttl = ttl;
    this.cacheDir = path.join(__dirname, '../../cache');
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  _file(key) {
    const h = require('crypto').createHash('md5').update(key).digest('hex');
    return path.join(this.cacheDir, `${h}.cache`);
  }

  get(key) {
    const file = this._file(key);
    try {
      const stat = fs.statSync(file);
      if ((Date.now() / 1000 - stat.mtimeMs / 1000) < this.ttl) {
        return fs.readFileSync(file, 'utf8');
      }
    } catch {
      // miss
    }
    return null;
  }

  set(key, data) {
    const file = this._file(key);
    const tmp = file + '.tmp.' + process.pid;
    try {
      fs.writeFileSync(tmp, data, { flag: 'w' });
      fs.renameSync(tmp, file);
    } catch {
      try { fs.unlinkSync(tmp); } catch { /* ignore */ }
    }
  }

  invalidate(key) {
    if (key) {
      try { fs.unlinkSync(this._file(key)); } catch { /* already gone */ }
    } else {
      const files = fs.readdirSync(this.cacheDir).filter(f => f.endsWith('.cache'));
      files.forEach(f => { try { fs.unlinkSync(path.join(this.cacheDir, f)); } catch { /* ignore */ } });
    }
  }
}

module.exports = CacheService;
