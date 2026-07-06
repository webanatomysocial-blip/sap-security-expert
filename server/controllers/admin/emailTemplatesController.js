const { asyncHandler } = require('../../utils/asyncHandler');
const { sendSuccess, sendError } = require('../../utils/apiResponse');
const repo = require('../../repositories/admin/emailTemplatesRepository');

// GET /api/admin/email-templates — list all templates
const list = asyncHandler(async (req, res) => {
  return sendSuccess(res, { templates: repo.list() });
});

// GET /api/admin/email-templates/:key(*) — read one template
const get = asyncHandler(async (req, res) => {
  const filePath = repo.safePath(req.params.key);
  if (!filePath) return sendError(res, 'Invalid template key', 400);
  if (!repo.exists(filePath)) return sendError(res, 'Template not found', 404);
  const content = repo.read(filePath);
  return sendSuccess(res, { key: req.params.key, content });
});

// PUT /api/admin/email-templates/:key(*) — save a template
const save = asyncHandler(async (req, res) => {
  const { content } = req.body || {};
  if (!content) return sendError(res, 'content is required', 400);
  const filePath = repo.safePath(req.params.key);
  if (!filePath) return sendError(res, 'Invalid template key', 400);
  if (!repo.exists(filePath)) return sendError(res, 'Template not found', 404);
  repo.write(filePath, content);
  return sendSuccess(res, { message: 'Template saved.' });
});

module.exports = { list, get, save };
