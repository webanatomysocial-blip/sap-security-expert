const AUTHOR_FIELDS = `
  CASE WHEN u.role = 'admin' OR b.author_id IS NULL OR b.author_id = 1 THEN 'Raghu Boddu'
       ELSE COALESCE(c.full_name, b.author) END AS author_name,
  CASE WHEN u.role = 'admin' OR b.author_id IS NULL OR b.author_id = 1 THEN '/assets/raghu_boddu.png'
       ELSE COALESCE(c.image, '/assets/placeholder.webp') END AS author_image,
  CASE WHEN u.role = 'admin' OR b.author_id IS NULL OR b.author_id = 1
       THEN COALESCE(u.bio, 'Founder & Security Expert at SAP Security Expert.')
       ELSE COALESCE(c.short_bio, 'Contributor') END AS author_bio
`;

// ── Site search ───────────────────────────────────────────────────────────
async function searchBlogs(db, likeQuery) {
  const [rows] = await db.execute(
    `SELECT id, title, slug, excerpt, image, image_alt, category, date, view_count
     FROM blogs
     WHERE status IN ('approved','published') AND (type IS NULL OR type = 'blog')
       AND (title LIKE ? OR excerpt LIKE ? OR tags LIKE ?)
     ORDER BY view_count DESC, date DESC
     LIMIT 8`,
    [likeQuery, likeQuery, likeQuery]
  );
  return rows;
}

// ── Homepage ──────────────────────────────────────────────────────────────
async function findCuratedHeroArticles(db, nowUtc) {
  const [rows] = await db.execute(
    `SELECT b.*, b.view_count, b.category,
      (SELECT COUNT(*) FROM comments c2 WHERE c2.post_id = b.slug AND c2.status = 'approved') AS comment_count,
      ${AUTHOR_FIELDS}
     FROM blogs b
     LEFT JOIN users u ON b.author_id = u.id
     LEFT JOIN contributors c ON u.contributor_id = c.id
     WHERE b.status IN ('approved','published') AND b.date <= ?
       AND (b.type IS NULL OR b.type = 'blog')
       AND b.homepage_featured_order > 0
     ORDER BY b.homepage_featured_order ASC, b.id ASC LIMIT 3`,
    [nowUtc]
  );
  return rows;
}

async function findFallbackHeroArticles(db, nowUtc) {
  const [rows] = await db.execute(
    `SELECT b.*, b.view_count, b.category,
      (SELECT COUNT(*) FROM comments c2 WHERE c2.post_id = b.slug AND c2.status = 'approved') AS comment_count,
      ${AUTHOR_FIELDS}
     FROM blogs b
     LEFT JOIN users u ON b.author_id = u.id
     LEFT JOIN contributors c ON u.contributor_id = c.id
     WHERE b.status IN ('approved','published') AND b.date <= ?
       AND (b.type IS NULL OR b.type = 'blog')
     ORDER BY b.date DESC, b.id DESC LIMIT 3`,
    [nowUtc]
  );
  return rows;
}

async function findRecentBlogs(db, { nowUtc, excludeIds }) {
  const excludeSql = excludeIds.length ? `AND b.id NOT IN (${excludeIds.map(() => '?').join(',')})` : '';
  const [rows] = await db.execute(
    `SELECT b.*, b.view_count, b.category,
      (SELECT COUNT(*) FROM comments c2 WHERE c2.post_id = b.slug AND c2.status = 'approved') AS comment_count,
      ${AUTHOR_FIELDS}
     FROM blogs b
     LEFT JOIN users u ON b.author_id = u.id
     LEFT JOIN contributors c ON u.contributor_id = c.id
     WHERE b.status = 'approved' AND b.date <= ?
       AND (b.type IS NULL OR b.type = 'blog') ${excludeSql}
     ORDER BY b.date DESC, b.id DESC LIMIT 10`,
    [nowUtc, ...excludeIds]
  );
  return rows;
}

async function findHomepageTrending(db, nowUtc) {
  const [rows] = await db.execute(
    `SELECT id, title, slug, category, view_count FROM blogs
     WHERE status IN ('approved','published') AND date <= ?
       AND (type IS NULL OR type = 'blog')
     ORDER BY view_count DESC LIMIT 5`,
    [nowUtc]
  );
  return rows;
}

async function findApprovedContributorsWithCounts(db) {
  const [rows] = await db.execute(
    `SELECT id, full_name, role, image AS profile_image, created_at,
       (SELECT COUNT(*) FROM blogs b JOIN users u ON b.author_id = u.id
        WHERE u.contributor_id = contributors.id AND b.status IN ('approved','published')) AS contributions_count
     FROM contributors WHERE status = 'approved' ORDER BY contributions_count DESC, created_at DESC`
  );
  return rows;
}

async function findExpertPicks(db, nowUtc) {
  const [rows] = await db.execute(
    `SELECT b.id, b.title, b.slug, b.category, b.image, b.excerpt, b.date, b.is_premium, b.is_members_only, b.is_expert_pick,
      ${AUTHOR_FIELDS}
     FROM blogs b
     LEFT JOIN users u ON b.author_id = u.id
     LEFT JOIN contributors c ON u.contributor_id = c.id
     WHERE b.status = 'approved' AND b.is_expert_pick = 1 AND b.date <= ?
     ORDER BY b.date DESC, b.id DESC LIMIT 8`,
    [nowUtc]
  );
  return rows;
}

async function findPremiumArticles(db, nowUtc) {
  const [rows] = await db.execute(
    `SELECT b.id, b.title, b.slug, b.category, b.image, b.excerpt, b.date, b.is_premium, b.is_members_only, b.credits_required,
      ${AUTHOR_FIELDS}
     FROM blogs b
     LEFT JOIN users u ON b.author_id = u.id
     LEFT JOIN contributors c ON u.contributor_id = c.id
     WHERE b.status = 'approved' AND (b.is_premium = 1 OR b.is_members_only = 1) AND b.date <= ?
     ORDER BY b.is_premium DESC, b.date DESC, b.id DESC LIMIT 8`,
    [nowUtc]
  );
  return rows;
}

// ── Misc public reads ─────────────────────────────────────────────────────
async function findTagsSample(db) {
  const [rows] = await db.execute(
    "SELECT tags FROM blogs WHERE status IN ('approved','published') AND tags IS NOT NULL AND tags != '' LIMIT 200"
  );
  return rows;
}

async function findLeaderboardContributors(db) {
  const [rows] = await db.execute(
    `SELECT c.id, c.full_name AS name, c.role, c.image AS profile_image, c.short_bio, c.created_at,
       (SELECT COUNT(*) FROM blogs b JOIN users u ON b.author_id = u.id
        WHERE u.contributor_id = c.id AND b.status IN ('approved','published')) AS contributions_count
     FROM contributors c WHERE c.status = 'approved'
     ORDER BY contributions_count DESC, c.created_at ASC`
  );
  return rows;
}

async function findPublicMemberById(db, id) {
  const [rows] = await db.execute(
    `SELECT id, name, profile_image, job_role, company_name, location, profile_visibility, created_at FROM members WHERE id = ? AND status = 'approved' LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function countApprovedCommentsByMember(db, memberId) {
  const [rows] = await db.execute(
    "SELECT COUNT(*) AS comment_count FROM comments WHERE member_id = ? AND status = 'approved'",
    [memberId]
  ).catch(() => [[{ comment_count: 0 }]]);
  return rows[0].comment_count;
}

async function countCommunityStats(db) {
  const [[c]] = await db.execute("SELECT COUNT(*) as c FROM contributors WHERE status = 'approved'");
  const [[m]] = await db.execute("SELECT COUNT(*) as c FROM members WHERE status = 'approved'");
  const [[a]] = await db.execute("SELECT COUNT(*) as c FROM blogs WHERE status IN ('approved','published')");
  const [[cm]] = await db.execute("SELECT COUNT(*) as c FROM comments WHERE status = 'approved'");
  return { active_contributors: c.c, total_members: m.c, total_articles: a.c, total_comments: cm.c };
}

async function findDistinctCategories(db) {
  const [rows] = await db.execute(
    "SELECT DISTINCT category FROM blogs WHERE status IN ('approved','published') AND category IS NOT NULL ORDER BY category ASC"
  );
  return rows.map(r => r.category);
}

async function findTrendingTopics(db) {
  const [rows] = await db.execute(
    `SELECT id, title, slug, category, view_count FROM blogs
     WHERE status IN ('approved','published') ORDER BY view_count DESC LIMIT 10`
  );
  return rows;
}

async function findPublicAnnouncements(db) {
  const [rows] = await db.execute(
    `SELECT id, title, slug, date, link, content, excerpt, image, image_alt, views, comments, created_at
     FROM announcements WHERE status IN ('approved','active','published') ORDER BY created_at DESC`
  );
  return rows;
}

async function findActiveAuthors(db) {
  const [rows] = await db.execute(
    `SELECT u.id, u.username, u.role,
       COALESCE(c.full_name, u.full_name, u.username) as display_name,
       COALESCE(c.image, u.profile_image) as image
     FROM users u
     LEFT JOIN contributors c ON u.contributor_id = c.id
     WHERE u.is_active = 1 ORDER BY u.role DESC, display_name ASC`
  );
  return rows;
}

// ── View tracking ─────────────────────────────────────────────────────────
async function findBlogIdBySlugOrId(db, id) {
  const [rows] = await db.execute('SELECT id FROM blogs WHERE slug = ? OR id = ? LIMIT 1', [id, id]);
  return rows[0]?.id || null;
}

async function findRecentViewByVisitor(db, blogId, visitorToken) {
  const [rows] = await db.execute(
    `SELECT id FROM post_views WHERE post_id = ? AND visitor_token = ?
     AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY) LIMIT 1`,
    [blogId, visitorToken]
  );
  return rows.length > 0;
}

async function insertPostView(db, blogId, visitorToken) {
  await db.execute(
    'INSERT IGNORE INTO post_views (post_id, visitor_token) VALUES (?, ?)',
    [blogId, visitorToken]
  );
}

async function incrementViewCount(db, blogId) {
  await db.execute(
    'UPDATE blogs SET view_count = COALESCE(view_count, 0) + 1 WHERE id = ?',
    [blogId]
  );
}

// ── Account deletion ──────────────────────────────────────────────────────
async function findUserById(db, id) {
  const [rows] = await db.execute('SELECT email, full_name, username FROM users WHERE id = ?', [id]);
  return rows[0] || null;
}

async function findMemberIdByEmail(db, email) {
  const [rows] = await db.execute('SELECT id FROM members WHERE LOWER(email) = LOWER(?)', [email]);
  return rows[0]?.id || null;
}

async function findActiveContributorIdByEmail(db, email) {
  const [rows] = await db.execute(
    "SELECT id FROM contributors WHERE LOWER(email) = LOWER(?) AND is_deleted = 0", [email]
  );
  return rows.length > 0;
}

async function deactivateContributorPath(db, { timestamp, ip, email, memberId }) {
  await db.execute(
    `UPDATE contributors SET is_deleted=1, deleted_at=?, deletion_ip=?,
     deletion_method='UI', deletion_confirmation_method='OTP', status='deactivated'
     WHERE LOWER(email) = LOWER(?)`,
    [timestamp, ip, email]
  );
  await db.execute(
    `UPDATE users SET is_active=0, is_deleted=1, deleted_at=?, deletion_ip=?
     WHERE LOWER(email) = LOWER(?)`,
    [timestamp, ip, email]
  );
  await db.execute(
    `UPDATE members SET is_deleted=1, deleted_at=?, deletion_ip=?,
     deletion_method='UI', deletion_confirmation_method='OTP', status='deactivated'
     WHERE (id=? OR LOWER(email)=LOWER(?))`,
    [timestamp, ip, memberId || 0, email]
  );
}

async function deactivateMemberPath(db, { timestamp, ip, email, memberId }) {
  await db.execute(
    `UPDATE members SET is_deleted=1, deleted_at=?, deletion_ip=?,
     deletion_method='UI', deletion_confirmation_method='OTP', status='deactivated'
     WHERE (id=? OR LOWER(email)=LOWER(?))`,
    [timestamp, ip, memberId || 0, email]
  );
  await db.execute(
    `UPDATE users SET is_active=0, is_deleted=1, deleted_at=?, deletion_ip=?
     WHERE LOWER(email)=LOWER(?)`,
    [timestamp, ip, email]
  );
}

// ── Plaintext content / sitemap / SEO ──────────────────────────────────────
async function findBlogForContent(db, slug) {
  const [rows] = await db.execute(
    `SELECT b.title, b.excerpt, b.content, b.date, b.category,
            CASE WHEN u.role = 'admin' OR b.author_id IS NULL OR b.author_id = 1 THEN 'Raghu Boddu'
                 ELSE COALESCE(c.full_name, b.author) END AS author_name
     FROM blogs b
     LEFT JOIN users u ON b.author_id = u.id
     LEFT JOIN contributors c ON u.contributor_id = c.id
     WHERE b.slug = ? AND b.status IN ('approved','published') LIMIT 1`,
    [slug]
  );
  return rows[0] || null;
}

async function findBlogsForSitemap(db) {
  const [rows] = await db.execute(
    "SELECT slug, category, updated_at, date FROM blogs WHERE status IN ('approved','published') AND (type IS NULL OR type = 'blog') ORDER BY updated_at DESC"
  );
  return rows;
}

async function findBlogForSeoMeta(db, slug) {
  const [rows] = await db.execute(
    `SELECT b.title, b.meta_description, b.excerpt, b.content, b.image, b.category,
            CASE WHEN u.role = 'admin' OR b.author_id IS NULL OR b.author_id = 1 THEN 'Raghu Boddu'
                 ELSE COALESCE(c.full_name, b.author) END AS author_name
     FROM blogs b
     LEFT JOIN users u ON b.author_id = u.id
     LEFT JOIN contributors c ON u.contributor_id = c.id
     WHERE b.slug = ? AND b.status IN ('approved','published') LIMIT 1`,
    [slug]
  );
  return rows[0] || null;
}

// ── News / Learnings ────────────────────────────────────────────────────
async function findLearnings(db, { nowUtc, category }) {
  const params = [nowUtc];
  let catClause = '';
  if (category) { catClause = 'AND b.category = ?'; params.push(category); }
  const [rows] = await db.execute(
    `SELECT id, title, slug, excerpt, image, image_alt, category, date, created_at, view_count,
            author, author_id,
            (SELECT COUNT(*) FROM comments c WHERE c.post_id = b.slug AND c.status = 'approved') AS comment_count
     FROM blogs b
     WHERE \`type\` = 'learning' AND status IN ('approved','published') AND date <= ?
     ${catClause}
     ORDER BY date DESC, created_at DESC`,
    params
  );
  return rows;
}

async function findLearningsCounts(db, nowUtc) {
  const [rows] = await db.execute(
    `SELECT category, COUNT(*) AS count
     FROM blogs
     WHERE \`type\` = 'learning' AND status IN ('approved','published') AND date <= ?
     GROUP BY category`,
    [nowUtc]
  );
  return rows;
}

async function findNews(db, nowUtc) {
  const [rows] = await db.execute(
    `SELECT id, title, slug, excerpt, image, image_alt, date, created_at, view_count,
            meta_title, meta_description,
            (SELECT COUNT(*) FROM comments c WHERE c.post_id = b.slug AND c.status = 'approved') AS comment_count
     FROM blogs b
     WHERE \`type\` = 'news' AND status IN ('approved','published') AND date <= ?
     ORDER BY date DESC, created_at DESC`,
    [nowUtc]
  );
  return rows;
}

async function findNewsBySlugOrId(db, slug) {
  const [rows] = await db.execute(
    `SELECT b.*,
            (SELECT COUNT(*) FROM comments c WHERE c.post_id = b.slug AND c.status = 'approved') AS comment_count
     FROM blogs b
     WHERE (b.slug = ? OR b.id = ?) AND b.\`type\` = 'news' AND b.status IN ('approved','published')
     LIMIT 1`,
    [slug, slug]
  );
  return rows[0] || null;
}

module.exports = {
  searchBlogs,
  findCuratedHeroArticles, findFallbackHeroArticles, findRecentBlogs, findHomepageTrending,
  findApprovedContributorsWithCounts, findExpertPicks, findPremiumArticles,
  findTagsSample, findLeaderboardContributors, findPublicMemberById, countApprovedCommentsByMember,
  countCommunityStats, findDistinctCategories, findTrendingTopics, findPublicAnnouncements, findActiveAuthors,
  findBlogIdBySlugOrId, findRecentViewByVisitor, insertPostView, incrementViewCount,
  findUserById, findMemberIdByEmail, findActiveContributorIdByEmail, deactivateContributorPath, deactivateMemberPath,
  findBlogForContent, findBlogsForSitemap, findBlogForSeoMeta,
  findLearnings, findLearningsCounts, findNews, findNewsBySlugOrId,
};
