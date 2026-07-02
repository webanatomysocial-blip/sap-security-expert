const router = require('express').Router();
const { requireAdmin } = require('../../middleware/auth');
const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, '../../templates');

function getTemplateList() {
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

// GET /api/admin/email-templates — list all templates
router.get('/', requireAdmin, (_req, res) => {
  try {
    return res.json({ status: 'success', templates: getTemplateList() });
  } catch (err) {
    console.error('[email-templates list]', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to list templates.' });
  }
});

// Secure path resolver — prevents traversal via resolved path comparison
function safeTemplatePath(key) {
  const resolved = path.resolve(TEMPLATES_DIR, key + '.html');
  const base     = path.resolve(TEMPLATES_DIR);
  if (!resolved.startsWith(base + path.sep) && resolved !== base) return null;
  return resolved;
}

// GET /api/admin/email-templates/:key(*) — read one template
router.get('/:key(*)', requireAdmin, (req, res) => {
  try {
    const filePath = safeTemplatePath(req.params.key);
    if (!filePath) return res.status(400).json({ status: 'error', message: 'Invalid template key' });
    if (!fs.existsSync(filePath)) return res.status(404).json({ status: 'error', message: 'Template not found' });
    const content = fs.readFileSync(filePath, 'utf8');
    return res.json({ status: 'success', key: req.params.key, content });
  } catch (err) {
    console.error('[email-templates GET]', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to read template.' });
  }
});

// PUT /api/admin/email-templates/:key(*) — save a template
router.put('/:key(*)', requireAdmin, (req, res) => {
  try {
    const { content } = req.body || {};
    if (!content) return res.status(400).json({ status: 'error', message: 'content is required' });
    const filePath = safeTemplatePath(req.params.key);
    if (!filePath) return res.status(400).json({ status: 'error', message: 'Invalid template key' });
    if (!fs.existsSync(filePath)) return res.status(404).json({ status: 'error', message: 'Template not found' });
    fs.writeFileSync(filePath, content, 'utf8');
    return res.json({ status: 'success', message: 'Template saved.' });
  } catch (err) {
    console.error('[email-templates PUT]', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to save template.' });
  }
});

module.exports = router;
