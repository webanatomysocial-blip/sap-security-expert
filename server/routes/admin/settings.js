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

module.exports = router;
