const { asyncHandler } = require('../../utils/asyncHandler');
const { sendSuccess, sendError } = require('../../utils/apiResponse');
const repo = require('../../repositories/admin/settingsRepository');

// GET /api/admin/settings
const getSettings = asyncHandler(async (req, res) => {
  const settings = await repo.getAllSettings(req.db);
  return sendSuccess(res, { settings });
});

// POST /api/admin/settings — body: { key, value }
const saveSetting = asyncHandler(async (req, res) => {
  const { key, value } = req.body || {};
  if (!key || value == null) return sendError(res, 'key and value are required', 400);

  const ALLOWED_KEYS = ['paywall_default_preview_paragraphs'];
  if (!ALLOWED_KEYS.includes(key)) return sendError(res, 'Unknown setting key', 400);

  if (key === 'paywall_default_preview_paragraphs') {
    const n = parseInt(value);
    if (isNaN(n) || n < 1 || n > 50) return sendError(res, 'Preview paragraphs must be between 1 and 50', 400);
    await repo.setSetting(req.db, key, n);
  }

  return sendSuccess(res, { message: 'Setting saved.' });
});

module.exports = { getSettings, saveSetting };
