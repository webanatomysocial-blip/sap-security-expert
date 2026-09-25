const AuditService = require('../../services/AuditService');
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

  const ALLOWED_KEYS = ['paywall_default_preview_paragraphs', 'home_modal'];
  if (!ALLOWED_KEYS.includes(key)) return sendError(res, 'Unknown setting key', 400);

  if (key === 'paywall_default_preview_paragraphs') {
    const n = parseInt(value);
    if (isNaN(n) || n < 1 || n > 50) return sendError(res, 'Preview paragraphs must be between 1 and 50', 400);
    await repo.setSetting(req.db, key, n);
  }

  if (key === 'home_modal') {
    let m;
    try { m = typeof value === 'string' ? JSON.parse(value) : value; } catch { return sendError(res, 'Invalid modal data', 400); }
    const image = String(m?.image || '').trim();
    const button_text = String(m?.button_text || '').trim().slice(0, 60);
    const button_link = String(m?.button_link || '').trim();
    if (image && !/^(\/uploads\/|https:\/\/)/.test(image)) return sendError(res, 'Invalid image path', 400);
    if (button_link && !/^(https?:\/\/|\/(?!\/))/i.test(button_link)) return sendError(res, 'Button link must start with https://, http:// or /', 400);
    await repo.setSetting(req.db, key, JSON.stringify({ enabled: !!m?.enabled, image, button_text, button_link }));
  }

  const audit = AuditService.fromRequest(req.db, req);
  audit.logReq('setting_changed', 'setting', key, `Setting "${key}" changed to "${value}"`).catch(() => {});

  return sendSuccess(res, { message: 'Setting saved.' });
});

module.exports = { getSettings, saveSetting };
