const { asyncHandler } = require('../../utils/asyncHandler');
const { sendSuccess, sendError } = require('../../utils/apiResponse');
const { deleteImage } = require('../../utils/helpers');
const repo = require('../../repositories/admin/adsRepository');

// GET /api/ads or /api/admin/ads
// Returns bare objects (a single row, or a zone->row map) — not the
// {status, ...} envelope used elsewhere. Preserved exactly.
const get = asyncHandler(async (req, res) => {
  const db = req.db;
  if (req.query.zone) {
    const row = await repo.findByZone(db, req.query.zone);
    return res.json(row || { active: 0 });
  }
  const rows = await repo.findAll(db);
  const map = {};
  rows.forEach((r) => { map[r.zone] = r; });
  return res.json(map);
});

// POST /api/ads or /api/admin/ads
const save = asyncHandler(async (req, res) => {
  const db = req.db;
  const { zone, image = '', link = '', active = false } = req.body || {};
  if (!zone) return sendError(res, 'Zone is required', 400);

  const isActive = active ? 1 : 0;
  const existing = await repo.findByZone(db, zone);

  if (existing) {
    let resetClicks = false;
    if (image && existing.image !== image) {
      if (existing.image) deleteImage(existing.image);
      resetClicks = true;
    }
    if (link !== existing.link) resetClicks = true;
    await repo.update(db, zone, { image, link, isActive }, resetClicks);
  } else {
    await repo.create(db, { zone, image, link, isActive });
  }

  return sendSuccess(res, { message: 'Ad updated' });
});

// POST /api/ads/click — rate limited to prevent click fraud
const click = asyncHandler(async (req, res) => {
  const { zone } = req.body || {};
  if (!zone) return sendError(res, 'Zone required', 400);
  await repo.incrementClicks(req.db, zone);
  return sendSuccess(res);
});

module.exports = { get, save, click };
