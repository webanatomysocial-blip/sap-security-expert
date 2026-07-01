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
router.get('/', requireAdmin, (req, res) => {
  try {
    return res.json({ status: 'success', templates: getTemplateList() });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// GET /api/admin/email-templates/:key(*) — read one template
router.get('/:key(*)', requireAdmin, (req, res) => {
  try {
    const key = req.params.key;
    const filePath = path.join(TEMPLATES_DIR, key + '.html');
    // Prevent path traversal
    if (!filePath.startsWith(TEMPLATES_DIR)) {
      return res.status(400).json({ status: 'error', message: 'Invalid template key' });
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ status: 'error', message: 'Template not found' });
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return res.json({ status: 'success', key, content });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// PUT /api/admin/email-templates/:key(*) — save a template
router.put('/:key(*)', requireAdmin, (req, res) => {
  try {
    const key = req.params.key;
    const { content } = req.body || {};
    if (!content) return res.status(400).json({ status: 'error', message: 'content is required' });
    const filePath = path.join(TEMPLATES_DIR, key + '.html');
    if (!filePath.startsWith(TEMPLATES_DIR)) {
      return res.status(400).json({ status: 'error', message: 'Invalid template key' });
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ status: 'error', message: 'Template not found' });
    }
    fs.writeFileSync(filePath, content, 'utf8');
    return res.json({ status: 'success', message: 'Template saved.' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
