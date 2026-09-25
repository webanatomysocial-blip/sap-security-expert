const router = require('express').Router();
const { requireAdmin } = require('../../middleware/auth');
const controller = require('../../controllers/admin/settingsController');
const repo = require('../../repositories/admin/settingsRepository');

router.get('/', requireAdmin, controller.getSettings);
router.post('/', requireAdmin, controller.saveSetting);

// Public read — frontend needs the global paywall default without admin auth
router.get('/public', async (req, res) => {
  const val = await repo.getSetting(req.db, 'paywall_default_preview_paragraphs');
  res.json({ paywall_default_preview_paragraphs: val != null ? parseInt(val) : 3 });
});

router.get('/home-modal', async (req, res) => {
  let m = {};
  try { m = JSON.parse(await repo.getSetting(req.db, 'home_modal') || '{}'); } catch { /* fall through to disabled */ }
  res.json({ enabled: !!(m.enabled && m.image), image: m.image || '', button_text: m.button_text || '', button_link: m.button_link || '' });
});

module.exports = router;
