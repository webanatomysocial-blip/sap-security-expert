const { asyncHandler } = require('../../utils/asyncHandler');
const { sendSuccess, sendError } = require('../../utils/apiResponse');
const { deleteImage } = require('../../utils/helpers');
const { sanitizeBlogHtml } = require('../../utils/sanitize');
const CacheService = require('../../services/CacheService');
const repo = require('../../repositories/admin/newsRepository');

const cache = new CacheService(1800);

// GET /api/admin/news — bare array, not the {status, ...} envelope
const list = asyncHandler(async (req, res) => {
  const rows = await repo.findAllNews(req.db);
  return res.json(rows);
});

// POST /api/admin/news — create or update a news item
const save = asyncHandler(async (req, res) => {
  const db = req.db;
  const adminId = req.session.admin_id;
  const adminName = 'Raghu Boddu';

  const data = req.body || {};
  const {
    id,
    title = '',
    excerpt = '',
    content = '',
    date,
    image = '',
    image_alt = '',
    tags = '',
    meta_title = '',
    meta_description = '',
    meta_keywords = '',
    faqs = [],
    cta_title = null,
    cta_description = null,
    cta_button_text = null,
    cta_button_link = null,
    status: requestedStatus,
  } = data;

  let slug = data.slug || '';
  if (!slug && title) {
    slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  // Ensure slug uniqueness
  if (slug) {
    const base = slug;
    let counter = 1;
    while (await repo.slugExists(db, slug, id)) {
      counter++;
      slug = `${base}-${counter}`;
    }
  }

  const targetStatus = requestedStatus || 'approved';
  const faqsJson = JSON.stringify((Array.isArray(faqs) ? faqs : []).map(f => ({
    question: typeof f.question === 'string' ? sanitizeBlogHtml(f.question) : '',
    answer: typeof f.answer === 'string' ? sanitizeBlogHtml(f.answer) : '',
  })));

  if (id) {
    const existing = await repo.findNewsById(db, id);
    if (!existing) return sendError(res, 'News item not found', 404);

    await repo.updateNews(db, id, {
      title, slug, excerpt, content, date, image, image_alt, tags, faqsJson,
      cta_title, cta_description, cta_button_text, cta_button_link,
      meta_title, meta_description, meta_keywords, targetStatus,
    });
    cache.invalidate('homepage_data_public');
    return sendSuccess(res, { message: 'News item updated' });
  } else {
    const newId = `news_${Date.now()}`;
    const publishDate = ['approved', 'published'].includes(targetStatus)
      ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null;

    await repo.createNews(db, newId, {
      title, slug, excerpt, content, adminName, adminId, date, image, image_alt,
      tags, faqsJson, cta_title, cta_description, cta_button_text, cta_button_link,
      meta_title, meta_description, meta_keywords, targetStatus, publishDate,
    });
    cache.invalidate('homepage_data_public');
    return sendSuccess(res, { message: 'News item created', id: newId });
  }
});

// DELETE /api/admin/news/:id
const remove = asyncHandler(async (req, res) => {
  const db = req.db;
  const { id } = req.params;

  const existing = await repo.findByIdOrSlugForDelete(db, id);
  if (!existing) return sendError(res, 'News item not found', 404);
  if (existing.image) deleteImage(existing.image);
  await repo.deleteNews(db, id);
  cache.invalidate('homepage_data_public');
  return sendSuccess(res, { message: 'News item deleted' });
});

module.exports = { list, save, remove };
