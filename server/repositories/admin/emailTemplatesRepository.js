// No database here — this "repository" wraps filesystem access to the email
// template files, keeping the same routes -> controller -> repository
// layering used everywhere else even though the backing store isn't SQL.
const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, '../../templates');

function list() {
  const results = [];
  const walk = (dir, prefix = '') => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory()) {
        walk(path.join(dir, e.name), prefix ? `${prefix}/${e.name}` : e.name);
      } else if (e.name.endsWith('.html')) {
        const key = (prefix ? `${prefix}/` : '') + e.name.replace('.html', '');
        results.push({ key, label: key.replace(/\//g, ' › ').replace(/_/g, ' ') });
      }
    }
  };
  walk(TEMPLATES_DIR);
  return results;
}

// Secure path resolver — prevents traversal via resolved path comparison
function safePath(key) {
  const resolved = path.resolve(TEMPLATES_DIR, key + '.html');
  const base = path.resolve(TEMPLATES_DIR);
  if (!resolved.startsWith(base + path.sep) && resolved !== base) return null;
  return resolved;
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function write(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

module.exports = { list, safePath, exists, read, write };
