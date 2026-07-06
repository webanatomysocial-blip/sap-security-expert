const { asyncHandler } = require('../../utils/asyncHandler');
const { sendSuccess, sendError } = require('../../utils/apiResponse');
const repo = require('../../repositories/admin/changelogRepository');

// GET /api/admin/changelog
const list = asyncHandler(async (req, res) => {
  const logs = await repo.findAll(req.db);
  return sendSuccess(res, { logs });
});

// POST /api/admin/changelog
const create = asyncHandler(async (req, res) => {
  const { version, title, description, type } = req.body || {};
  if (!version || !title || !description) {
    return sendError(res, 'version, title, and description are required', 400);
  }
  await repo.create(req.db, { version, title, description, type: type || 'feature', created_by: req.session.admin_id });
  return sendSuccess(res, { message: 'Changelog entry added.' });
});

// PUT /api/admin/changelog/:id
const update = asyncHandler(async (req, res) => {
  const { version, title, description, type } = req.body || {};
  await repo.update(req.db, req.params.id, { version, title, description, type: type || 'feature' });
  return sendSuccess(res, { message: 'Updated.' });
});

// DELETE /api/admin/changelog/:id
const remove = asyncHandler(async (req, res) => {
  await repo.remove(req.db, req.params.id);
  return sendSuccess(res, { message: 'Deleted.' });
});

module.exports = { list, create, update, remove };
