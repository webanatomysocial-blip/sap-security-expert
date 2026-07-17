const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

class CacheService {
  constructor(ttl = 3600) {
    this.ttl = ttl;
    this.cacheDir = path.join(__dirname, '../../cache');
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  _file(key) {
    const h = crypto.createHash('md5').update(key).digest('hex');
    return path.join(this.cacheDir, `${h}.cache`);
  }

  async get(key) {
    const file = this._file(key);
    try {
      const stat = await fsp.stat(file);
      if ((Date.now() - stat.mtimeMs) / 1000 < this.ttl) {
        return fsp.readFile(file, 'utf8');
      }
    } catch {
      // cache miss
    }
    return null;
  }

  async set(key, data) {
    const file = this._file(key);
    const tmp = `${file}.tmp.${process.pid}`;
    try {
      await fsp.writeFile(tmp, data, { flag: 'w' });
      await fsp.rename(tmp, file);
    } catch {
      fsp.unlink(tmp).catch(() => {});
    }
  }

  invalidate(key) {
    if (key) {
      fsp.unlink(this._file(key)).catch(() => {});
    } else {
      fsp.readdir(this.cacheDir).then(files => {
        for (const f of files) {
          if (f.endsWith('.cache')) fsp.unlink(path.join(this.cacheDir, f)).catch(() => {});
        }
      }).catch(() => {});
    }
  }
}

module.exports = CacheService;
