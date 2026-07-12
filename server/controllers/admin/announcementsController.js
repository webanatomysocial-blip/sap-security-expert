const { asyncHandler } = require('../../utils/asyncHandler');
const { sendSuccess, sendError } = require('../../utils/apiResponse');
const CacheService = require('../../services/CacheService');
const repo = require('../../repositories/admin/announcementsRepository');
const { sanitizeBlogHtml } = require('../../utils/sanitize');

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

const VALID_ANN_STATUSES = ['approved', 'draft', 'pending'];

// POST /api/admin/announcements
const save = asyncHandler(async (req, res) => {
  const db = req.db;
  const isAdmin = req.session.role === 'admin';
  const {
    id, title: rawTitle = '', date, link: rawLink = '',
    content: rawContent = '', excerpt: rawExcerpt = '', image = '', image_alt: rawImageAlt = '',
    status: reqStatus,
  } = req.body || {};

  // Sanitize all text fields that render as HTML or appear in the admin UI
  const title = String(rawTitle).trim();
  const excerpt = String(rawExcerpt).trim();
  const image_alt = String(rawImageAlt).trim();
  // link must be a safe URL — strip javascript: and other dangerous schemes
  const rawLinkStr = String(rawLink).trim();
  const link = /^https?:\/\//i.test(rawLinkStr) || rawLinkStr === '' ? rawLinkStr : '';
  const content = sanitizeBlogHtml(rawContent);

  // Validate date before parsing to avoid Invalid time value TypeError.
  // date is NOT NULL in the schema — fall back to NOW() when omitted.
  let mysqlDate;
  if (date) {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return sendError(res, 'Invalid date value.', 400);
    mysqlDate = parsed.toISOString().slice(0, 19).replace('T', ' ');
  } else {
    mysqlDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
  }

  // Allowlist status values — reject arbitrary strings from the request body
  const requestedStatus = reqStatus && VALID_ANN_STATUSES.includes(reqStatus) ? reqStatus : null;

  const slug = generateSlug(title);

  if (id) {
    const existing = await repo.findStatusById(db, id);
    if (!existing) return sendError(res, 'Not found', 404);

    if (existing.status === 'approved' && !isAdmin) {
      await repo.saveDraft(db, id, { title, date: mysqlDate, link });
      cache.invalidate('homepage_data_public');
      return sendSuccess(res, { message: 'Changes saved for review.' });
    }

    const status = isAdmin ? (requestedStatus || 'approved') : 'draft';
    await repo.update(db, id, { title, slug, date: mysqlDate, link, status, content, excerpt, image, image_alt });
  } else {
    const status = isAdmin ? (requestedStatus || 'approved') : 'draft';
    const submissionStatus = isAdmin ? 'approved' : 'pending';
    await repo.create(db, { title, slug, date: mysqlDate, link, status, content, excerpt, image, image_alt, submissionStatus });
  }

  cache.invalidate('homepage_data_public');
  return sendSuccess(res, { message: id ? 'Announcement updated' : 'Announcement created' });
});

// DELETE /api/admin/announcements
const remove = asyncHandler(async (req, res) => {
  const db = req.db;
  const id = req.query.id || req.body?.id;
  if (!id) return sendError(res, 'ID required', 400);

  const isAdmin = req.session.role === 'admin';
  if (!isAdmin) {
    const existing = await repo.findStatusById(db, id);
    if (!existing) return sendError(res, 'Not found', 404);
    // Non-admins can only delete their own drafts/pending items, not approved announcements
    if (existing.status === 'approved') {
      return sendError(res, 'Only admins can delete approved announcements.', 403);
    }
  }

  await repo.remove(db, id);
  cache.invalidate('homepage_data_public');
  return sendSuccess(res, { message: 'Deleted' });
});

// POST /api/admin/announcements/:id/review
const review = asyncHandler(async (req, res) => {
  const db = req.db;
  const { id } = req.params;
  const { action } = req.body || {};

  if (!['approve', 'reject'].includes(action)) {
    return sendError(res, 'Invalid action. Must be approve or reject.', 400);
  }

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
