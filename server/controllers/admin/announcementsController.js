const { asyncHandler } = require('../../utils/asyncHandler');
const { sendSuccess, sendError } = require('../../utils/apiResponse');
const CacheService = require('../../services/CacheService');
const repo = require('../../repositories/admin/announcementsRepository');

const cache = new CacheService(1800);

const generateSlug = (title) =>
  title.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');

// GET /api/announcements or /api/admin/announcements — bare array
const list = asyncHandler(async (req, res) => {
  const isAdmin = req.session.admin_logged_in && req.session.role === 'admin';
  const rows = await repo.findAll(req.db, { isAdmin });
  return res.json(rows);
});

// GET /api/admin/announcements/:slug — bare object
const getBySlug = asyncHandler(async (req, res) => {
  const isAdmin = req.session.admin_logged_in && req.session.role === 'admin';
  const row = await repo.findBySlug(req.db, req.params.slug, { isAdmin });
  if (!row) return sendError(res, 'Not found', 404);
  return res.json(row);
});

// POST /api/admin/announcements
const save = asyncHandler(async (req, res) => {
  const db = req.db;
  const isAdmin = req.session.role === 'admin';
  const {
    id, title = '', date, link = '',
    content = '', excerpt = '', image = '', image_alt = '',
    status: reqStatus,
  } = req.body || {};

  const slug = generateSlug(title);
  const mysqlDate = date ? new Date(date).toISOString().slice(0, 19).replace('T', ' ') : null;

  if (id) {
    const existing = await repo.findStatusById(db, id);
    if (!existing) return sendError(res, 'Not found', 404);

    if (existing.status === 'approved' && !isAdmin) {
      await repo.saveDraft(db, id, { title, date: mysqlDate, link });
      cache.invalidate('homepage_data_public');
      return sendSuccess(res, { message: 'Changes saved for review.' });
    }

    const status = reqStatus || (isAdmin ? 'approved' : 'draft');
    await repo.update(db, id, { title, slug, date: mysqlDate, link, status, content, excerpt, image, image_alt });
  } else {
    const status = reqStatus || (isAdmin ? 'approved' : 'draft');
    const submissionStatus = isAdmin ? 'approved' : 'pending';
    await repo.create(db, { title, slug, date: mysqlDate, link, status, content, excerpt, image, image_alt, submissionStatus });
  }

  cache.invalidate('homepage_data_public');
  return sendSuccess(res, { message: id ? 'Announcement updated' : 'Announcement created' });
});

// DELETE /api/admin/announcements
const remove = asyncHandler(async (req, res) => {
  const id = req.query.id || req.body?.id;
  if (!id) return sendError(res, 'ID required', 400);
  await repo.remove(req.db, id);
  cache.invalidate('homepage_data_public');
  return sendSuccess(res, { message: 'Deleted' });
});

// POST /api/admin/announcements/:id/review
const review = asyncHandler(async (req, res) => {
  const db = req.db;
  const { id } = req.params;
  const { action } = req.body || {};

  const ann = await repo.findFullById(db, id);
  if (!ann) return sendError(res, 'Not found', 404);

  if (action === 'approve') {
    if (ann.submission_status === 'edited') {
      await repo.approveEdited(db, id);
    } else {
      await repo.approveDirect(db, id);
    }
    cache.invalidate('homepage_data_public');
    return sendSuccess(res, { message: 'Approved' });
  } else {
    if (ann.submission_status === 'edited') {
      await repo.rejectEdited(db, id);
    } else {
      await repo.remove(db, id);
    }
    cache.invalidate('homepage_data_public');
    return sendSuccess(res, { message: 'Rejected' });
  }
});

module.exports = { list, getBySlug, save, remove, review };
