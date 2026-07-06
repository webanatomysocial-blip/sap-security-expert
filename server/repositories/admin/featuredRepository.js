async function findEligibleBlogs(db) {
  const [blogs] = await db.execute(
    `SELECT id, title, slug, category, image, homepage_featured_image, homepage_featured_order
     FROM blogs
     WHERE status IN ('approved','published') AND (type IS NULL OR type = 'blog')
     ORDER BY CASE WHEN homepage_featured_order > 0 THEN 0 ELSE 1 END,
              homepage_featured_order ASC, date DESC, id DESC`
  );
  return blogs;
}

async function resetFeaturedOrder(db) {
  await db.execute('UPDATE blogs SET homepage_featured_order = 0 WHERE homepage_featured_order > 0');
}

async function setFeatured(db, id, order, image) {
  await db.execute(
    'UPDATE blogs SET homepage_featured_order = ?, homepage_featured_image = ? WHERE id = ?',
    [order, image || null, id]
  );
}

module.exports = { findEligibleBlogs, resetFeaturedOrder, setFeatured };
