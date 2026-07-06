const { asyncHandler } = require('../../utils/asyncHandler');
const repo = require('../../repositories/admin/statsRepository');

// GET /api/admin/stats — returns a bare object, not the {status, ...} envelope
const adminStats = asyncHandler(async (req, res) => {
  const stats = await repo.getAdminStats(req.db);
  return res.json(stats);
});

// GET /api/contributor/stats — returns a bare object
const contributorStats = asyncHandler(async (req, res) => {
  const stats = await repo.getContributorStats(req.db, req.session.admin_id);
  return res.json(stats);
});

module.exports = { adminStats, contributorStats };
