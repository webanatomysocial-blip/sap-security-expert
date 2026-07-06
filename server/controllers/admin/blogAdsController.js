const { asyncHandler } = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/apiResponse');
const { deleteImage } = require('../../utils/helpers');
const repo = require('../../repositories/admin/blogAdsRepository');

// GET /api/admin/blog-ads — list all (admin only)
const list = asyncHandler(async (req, res) => {
  const ads = await repo.findAll(req.db);
  return sendSuccess(res, { ads });
});

// GET /api/blog-ads/for-blog?slug=xxx — public, returns active ads for a blog
const listForBlog = asyncHandler(async (req, res) => {
  const { slug } = req.query;
  const active = await repo.findActive(req.db);
  const matching = active.filter((r) => r.target === 'all' || (r.blog_slugs || []).includes(slug));
  return sendSuccess(res, { ads: matching });
});

// POST /api/admin/blog-ads — create or update (admin only)
const save = asyncHandler(async (req, res) => {
  const { id, ad_type = 'inline', target = 'all', blog_slugs = [], position = 3, image = '', link = '', title = '', active = false } = req.body || {};
  const slugsJson = JSON.stringify(Array.isArray(blog_slugs) ? blog_slugs : []);
  const isActive = active ? 1 : 0;
  const fields = { ad_type, target, blog_slugs: slugsJson, position, image, link, title, active: isActive };

  if (id) {
    const existingImage = await repo.findImageById(req.db, id);
    if (existingImage && image && existingImage !== image) {
      deleteImage(existingImage);
    }
    await repo.update(req.db, id, fields);
  } else {
    await repo.create(req.db, fields);
  }
  return sendSuccess(res, { message: 'Ad saved.' });
});

// PATCH /api/admin/blog-ads/:id/toggle — quick toggle active
const toggle = asyncHandler(async (req, res) => {
  await repo.toggleActive(req.db, req.params.id);
  return sendSuccess(res);
});

// POST /api/blog-ads/click/:id — public click tracking.
// Intentionally never fails the request even if the DB write throws — a
// broken click counter should never be visible to the visitor clicking the
// ad. Not wrapped in asyncHandler on purpose: this swallows its own errors
// instead of forwarding them to the global error handler.
const click = async (req, res) => {
  try {
    await repo.incrementClicks(req.db, req.params.id);
    return sendSuccess(res);
  } catch {
    return res.json({ status: 'ok' });
  }
};

// DELETE /api/admin/blog-ads/:id (admin only)
const remove = asyncHandler(async (req, res) => {
  const image = await repo.findImageById(req.db, req.params.id);
  if (image) deleteImage(image);
  await repo.remove(req.db, req.params.id);
  return sendSuccess(res, { message: 'Ad deleted.' });
});

module.exports = { list, listForBlog, save, toggle, click, remove };
