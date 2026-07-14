const { asyncHandler } = require('../../utils/asyncHandler');
const { sendSuccess } = require('../../utils/apiResponse');
const CacheService = require('../../services/CacheService');
const repo = require('../../repositories/admin/featuredRepository');

const cache = new CacheService(1800);

// GET /api/admin/featured-insights — current selection + all eligible blogs
const list = asyncHandler(async (req, res) => {
  const blogs = await repo.findEligibleBlogs(req.db);
  const selected = blogs
    .filter((b) => b.homepage_featured_order > 0)
    .sort((a, b) => a.homepage_featured_order - b.homepage_featured_order);
  return sendSuccess(res, { blogs, selected });
});

// POST /api/admin/featured-insights — save curated selection (ordered, max 5)
// Body: { items: [{ id, homepage_featured_image }] } (order = array index)
const save = asyncHandler(async (req, res) => {
  const db = req.db;
  const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 5) : [];

  // Reset all to 0 (= not featured). Avoids NULL so NOT NULL columns are safe.
  await repo.resetFeaturedOrder(db);

  // Apply the new ordered selection (1, 2, 3).
  let order = 1;
  for (const item of items) {
    if (!item || !item.id) continue;
    await repo.setFeatured(db, item.id, order, item.homepage_featured_image);
    order++;
  }

  cache.invalidate('homepage_data_public');
  return sendSuccess(res, { message: 'Featured Insights updated.' });
});

module.exports = { list, save };
