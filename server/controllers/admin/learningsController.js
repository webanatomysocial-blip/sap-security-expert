const { asyncHandler } = require('../../utils/asyncHandler');
const { sendSuccess, sendError } = require('../../utils/apiResponse');
const { deleteImage } = require('../../utils/helpers');
const { sanitizeBlogHtml } = require('../../utils/sanitize');
const CacheService = require('../../services/CacheService');
const repo = require('../../repositories/admin/learningsRepository');

const cache = new CacheService(1800);

const MODULE_CATEGORIES = [
  'security-fundamentals',
  'user-management',
  'role-management',
  'authorization-concepts',
  'audit-compliance',
  'grc-advanced',
];

// GET /api/admin/learnings — bare array, not the {status, ...} envelope
const list = asyncHandler(async (req, res) => {
  const rows = await repo.findAllLearnings(req.db);
  return res.json(rows);
});

// POST /api/admin/learnings — create or update
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
    faqs = [],
    cta_title = null,
    cta_description = null,
    cta_button_text = null,
    cta_button_link = null,
    meta_title = '',
    meta_description = '',
    meta_keywords = '',
    schema_type = 'Article',
    article_section = null,
    co_authors = [],
    related_blogs = [],
    seo_score = 0,
    is_members_only = 0,
    send_notification_email = 0,
    status: requestedStatus,
  } = data;

  const category = MODULE_CATEGORIES.includes(data.category) ? data.category : 'security-fundamentals';

  // secondary_categories — for learnings we ignore these (module = primary only)
  const secondaryCatsJson = '[]';

  let slug = data.slug || '';
  if (!slug && title) {
    slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  if (slug) {
    const base = slug;
    let counter = 1;
    while (await repo.slugExists(db, slug, id)) {
      slug = `${base}-${++counter}`;
    }
  }

  const targetStatus = requestedStatus || 'approved';
  const faqsJson = JSON.stringify((Array.isArray(faqs) ? faqs : []).map(f => ({
    question: typeof f.question === 'string' ? sanitizeBlogHtml(f.question) : '',
    answer: typeof f.answer === 'string' ? sanitizeBlogHtml(f.answer) : '',
  })));
  const coAuthorsJson = JSON.stringify(Array.isArray(co_authors) ? co_authors : []);
  const relatedBlogsJson = typeof related_blogs === 'string' ? related_blogs : JSON.stringify(Array.isArray(related_blogs) ? related_blogs : []);

  if (id) {
    const existing = await repo.findLearningById(db, id);
    if (!existing) return sendError(res, 'Learning not found', 404);

    await repo.updateLearning(db, id, {
      title, slug, excerpt, content, category, secondaryCatsJson, date, image, image_alt, tags, faqsJson,
      cta_title, cta_description, cta_button_text, cta_button_link,
      meta_title, meta_description, meta_keywords, schema_type, article_section,
      coAuthorsJson, relatedBlogsJson, seo_score, is_members_only, send_notification_email, targetStatus,
    });
    cache.invalidate('learning_counts');
    return sendSuccess(res, { message: 'Learning updated' });
  } else {
    const newId = `learning_${Date.now()}`;
    const publishDate = ['approved', 'published'].includes(targetStatus)
      ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null;

    await repo.createLearning(db, newId, {
      title, slug, excerpt, content, adminName, adminId, date, image, image_alt,
      category, secondaryCatsJson, tags, faqsJson,
      cta_title, cta_description, cta_button_text, cta_button_link,
      meta_title, meta_description, meta_keywords,
      schema_type, article_section, coAuthorsJson, relatedBlogsJson,
      seo_score, targetStatus, is_members_only, send_notification_email, publishDate,
    });
    cache.invalidate('learning_counts');
    return sendSuccess(res, { message: 'Learning created', id: newId });
  }
});

// DELETE /api/admin/learnings/:id
const remove = asyncHandler(async (req, res) => {
  const db = req.db;
  const { id } = req.params;

  const existing = await repo.findByIdOrSlugForDelete(db, id);
  if (!existing) return sendError(res, 'Learning not found', 404);
  if (existing.image) deleteImage(existing.image);
  await repo.deleteLearning(db, id);
  cache.invalidate('learning_counts');
  return sendSuccess(res, { message: 'Learning deleted' });
});

module.exports = { list, save, remove };
