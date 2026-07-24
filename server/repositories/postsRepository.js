// Author info SELECT fragment (reused in GET queries)
const AUTHOR_FIELDS = `
  u.id as author_user_id, u.username as author_username, u.role as author_role,
  CASE
    WHEN b.author_id IS NULL OR b.author_id = 1 THEN 'Raghu Boddu'
    ELSE COALESCE(c.full_name, u.full_name, u.username, b.author)
  END as author_name,
  CASE
    WHEN b.author_id IS NULL OR b.author_id = 1 THEN '/assets/raghu_boddu.png'
    ELSE COALESCE(c.image, u.profile_image)
  END as author_image,
  COALESCE(c.short_bio, u.bio) as author_bio,
  COALESCE(c.designation, u.designation) as author_designation,
  COALESCE(c.linkedin, u.linkedin) as author_linkedin,
  COALESCE(c.twitter_handle, u.twitter_handle) as author_twitter,
  COALESCE(c.personal_website, u.personal_website) as author_website,
  CASE
    WHEN b.author_id IS NULL OR b.author_id = 1 THEN 'raghu'
    ELSE CAST(c.id AS CHAR)
  END as author_contributor_id
`;

async function getExclusivePremiumCounts(db) {
  const [rows] = await db.execute(
    `SELECT
      COUNT(CASE WHEN is_members_only = 1 THEN 1 END) AS exclusive_count,
      COUNT(CASE WHEN is_premium = 1 THEN 1 END)      AS premium_count
     FROM blogs
     WHERE status IN ('approved','published')`
  );
  return rows[0] || {};
}

async function findSuggestedCurrent(db, slug) {
  const [[current]] = await db.execute(
    `SELECT id, category, tags, title FROM blogs WHERE slug = ? LIMIT 1`,
    [slug]
  );
  return current || null;
}

const SUGGESTED_COLS = 'id, title, slug, category, image, image_alt, excerpt, date, view_count, tags';

async function findSameCategoryCandidates(db, { nowUtc, currentId, category }) {
  const [rows] = await db.execute(
    `SELECT ${SUGGESTED_COLS} FROM blogs
     WHERE status IN ('approved','published') AND date <= ? AND id != ? AND category = ?
     ORDER BY view_count DESC, date DESC LIMIT 12`,
    [nowUtc, currentId, category]
  );
  return rows;
}

async function findCrossCategoryCandidates(db, { nowUtc, currentId, category }) {
  const [rows] = await db.execute(
    `SELECT ${SUGGESTED_COLS} FROM blogs
     WHERE status IN ('approved','published') AND date <= ? AND id != ? AND category != ?
     ORDER BY view_count DESC, date DESC LIMIT 50`,
    [nowUtc, currentId, category]
  );
  return rows;
}

async function findPopularFallback(db, currentId) {
  const [rows] = await db.execute(
    `SELECT ${SUGGESTED_COLS} FROM blogs
     WHERE status IN ('approved','published') AND id != ?
     ORDER BY view_count DESC, date DESC LIMIT 20`,
    [currentId]
  );
  return rows;
}

async function updateBadges(db, id, { badge_expert_reviewed, badge_sap_notes_verified, badge_tested_s4hana, badge_field_validated, level }) {
  await db.execute(
    `UPDATE blogs SET badge_expert_reviewed=?, badge_sap_notes_verified=?, badge_tested_s4hana=?, badge_field_validated=?, difficulty_level=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [badge_expert_reviewed ? 1 : 0, badge_sap_notes_verified ? 1 : 0, badge_tested_s4hana ? 1 : 0, badge_field_validated ? 1 : 0, level, id]
  );
}

async function findSingleBySlugOrId(db, idOrSlug, { isContributor, authorOnly, currentUserId, isAdmin }) {
  let sql = `SELECT b.*, b.view_count,
    (SELECT COUNT(*) FROM comments c_count WHERE c_count.post_id = b.slug AND c_count.status = 'approved') as comment_count,
    ${AUTHOR_FIELDS}
    FROM blogs b
    LEFT JOIN users u ON b.author_id = u.id
    LEFT JOIN contributors c ON u.contributor_id = c.id
    WHERE (b.slug = ? OR b.id = ?)`;
  const params = [idOrSlug, idOrSlug];

  if (isContributor && authorOnly) {
    sql += ' AND b.author_id = ?'; params.push(currentUserId);
  } else if (!isAdmin) {
    sql += " AND b.status IN ('approved','published')";
  }

  const [rows] = await db.execute(sql, params);
  return rows[0] || null;
}

async function hasUnlockedBlog(db, memberId, slug) {
  const [rows] = await db.execute(
    'SELECT id FROM member_blog_unlocks WHERE member_id = ? AND blog_slug = ? LIMIT 1',
    [memberId, slug]
  );
  return rows.length > 0;
}

async function findUnlockedSlugsForMember(db, memberId) {
  const [rows] = await db.execute(
    'SELECT blog_slug FROM member_blog_unlocks WHERE member_id = ?',
    [memberId]
  );
  return rows.map(r => r.blog_slug);
}

async function findList(db, { isContributor, authorOnly, currentUserId, isAdminLoggedIn, trending, filterCategory, nowUtc }) {
  let sql = `SELECT b.*, b.view_count,
    (SELECT COUNT(*) FROM comments c_count WHERE c_count.post_id = b.slug AND c_count.status = 'approved') as comment_count,
    ${AUTHOR_FIELDS}
    FROM blogs b
    LEFT JOIN users u ON b.author_id = u.id
    LEFT JOIN contributors c ON u.contributor_id = c.id`;
  const params = [];

  if (trending) {
    sql = `SELECT b.*, b.view_count,
      (SELECT COUNT(*) FROM comments c_count WHERE c_count.post_id = b.slug AND c_count.status = 'approved') as comment_count,
      (SELECT COUNT(*) FROM post_views pv WHERE pv.post_id = b.id AND pv.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as recent_views,
      ${AUTHOR_FIELDS}
      FROM blogs b
      LEFT JOIN users u ON b.author_id = u.id
      LEFT JOIN contributors c ON u.contributor_id = c.id
      WHERE b.status IN ('approved','published') AND b.status != 'draft' AND b.date <= ? AND (b.type IS NULL OR b.type NOT IN ('news','learning'))`;
    params.push(nowUtc);
  } else if (isContributor && authorOnly) {
    sql += " WHERE b.author_id = ? AND (b.type IS NULL OR b.type NOT IN ('news','learning'))"; params.push(currentUserId);
  } else if (!isAdminLoggedIn || (isContributor && !authorOnly)) {
    sql += " WHERE b.status IN ('approved','published') AND b.status != 'draft' AND b.date <= ? AND (b.type IS NULL OR b.type NOT IN ('news','learning'))"; params.push(nowUtc);
  } else {
    sql += " WHERE (b.type IS NULL OR b.type NOT IN ('news','learning'))";
  }

  if (filterCategory) {
    sql += ' AND (b.category = ? OR b.subCategory = ? OR JSON_CONTAINS(b.secondary_categories, JSON_QUOTE(?)))';
    params.push(filterCategory, filterCategory, filterCategory);
  }

  if (trending) {
    sql += ' ORDER BY recent_views DESC, b.view_count DESC LIMIT 5';
  } else {
    sql += ' ORDER BY b.created_at DESC';
  }

  const [rows] = await db.execute(sql, params);
  return rows;
}

async function findByIds(db, ids) {
  if (!ids.length) return [];
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await db.execute(
    `SELECT id, title, slug, category, image, image_alt, excerpt, date, view_count
     FROM blogs WHERE id IN (${placeholders}) AND status IN ('approved','published')`,
    ids
  );
  return rows;
}

async function findAuthorDisplayName(db, userId) {
  const [rows] = await db.execute(
    `SELECT COALESCE(c.full_name, u.full_name, u.username) as display_name
     FROM users u LEFT JOIN contributors c ON u.contributor_id = c.id
     WHERE u.id = ? AND u.is_active = 1`,
    [userId]
  );
  return rows[0] || null;
}

async function slugExists(db, slug, excludeId) {
  const [existing] = await db.execute(
    'SELECT id FROM blogs WHERE slug = ? AND id != ?',
    [slug, excludeId || '']
  );
  return existing.length > 0;
}

async function findExistingForUpdate(db, id) {
  const [existing] = await db.execute(
    'SELECT author_id, author, submission_status, status, plagiarism_score, publish_date, slug, content, content_version, image FROM blogs WHERE id = ?',
    [id]
  );
  return existing[0] || null;
}

async function cascadeSlugChange(db, oldSlug, newSlug) {
  await db.execute('UPDATE comments SET post_id = ? WHERE post_id = ?', [newSlug, oldSlug]);
}

async function saveEditForReview(db, id, f) {
  await db.execute(
    `UPDATE blogs SET draft_title=?, draft_excerpt=?, draft_content=?,
     draft_meta_title=?, draft_meta_description=?, draft_meta_keywords=?,
     draft_image=?, draft_image_alt=?, draft_category=?, draft_faqs=?, draft_secondary_categories=?,
     draft_cta_title=?, draft_cta_description=?, draft_cta_button_text=?, draft_cta_button_link=?,
     seo_score=?, plagiarism_score=?, submission_status='edited', updated_at=CURRENT_TIMESTAMP
     WHERE id=?`,
    [f.title, f.excerpt, f.content, f.meta_title, f.meta_description, f.meta_keywords, f.image, f.image_alt || null,
     f.category, f.faqsJson, f.secondaryCatsJson,
     f.cta_title, f.cta_description, f.cta_button_text, f.cta_button_link, f.seoScore, f.finalPlag, id]
  );
}

async function updateBlogStandard(db, id, f) {
  let publishDateSql = '';
  const publishParams = [];
  if (f.setPublishDate) {
    publishDateSql = "publish_date = CURRENT_TIMESTAMP, date = COALESCE(NULLIF(?, ''), CURRENT_DATE),";
    publishParams.push(f.date || '');
  }

  await db.execute(
    `UPDATE blogs SET
     title=?, slug=?, excerpt=?, content=?, date=COALESCE(NULLIF(?,''),CURRENT_DATE), image=?, image_alt=?, category=?, tags=?, faqs=?,
     secondary_categories=?,
     cta_title=?, cta_description=?, cta_button_text=?, cta_button_link=?,
     meta_title=?, meta_description=?, meta_keywords=?,
     schema_type=?, article_section=?,
     status=?, submission_status=?, rejection_feedback=NULL,
     author_id=?, author=?, seo_score=?, plagiarism_score=?, plagiarism_status='completed',
     is_members_only=?, is_premium=?, credits_required=?, related_blogs=?, co_authors=?, send_notification_email=?,
     badge_expert_reviewed=?, badge_sap_notes_verified=?, badge_tested_s4hana=?, badge_field_validated=?, difficulty_level=?, content_version=?, preview_paragraphs=?,
     updated_at=CURRENT_TIMESTAMP,
     ${publishDateSql}
     draft_title=NULL, draft_content=NULL, draft_excerpt=NULL, draft_image=NULL, draft_image_alt=NULL,
     draft_category=NULL, draft_faqs=NULL, draft_meta_title=NULL, draft_meta_description=NULL,
     draft_meta_keywords=NULL, draft_cta_title=NULL, draft_cta_description=NULL,
     draft_cta_button_text=NULL, draft_cta_button_link=NULL, draft_secondary_categories=NULL
     WHERE id=?`,
    [f.title, f.slug, f.excerpt, f.content, f.date || '', f.image, f.image_alt || null, f.category, f.tags, f.faqsJson,
     f.secondaryCatsJson,
     f.cta_title, f.cta_description, f.cta_button_text, f.cta_button_link,
     f.meta_title, f.meta_description, f.meta_keywords,
     f.schema_type || 'BlogPosting', f.article_section || null,
     f.targetStatus, f.subStatus, f.author_id, f.authorName, f.seoScore, f.finalPlag,
     // is_members_only and is_premium are mutually exclusive — if both arrive
     // (e.g. stale form state), premium wins and exclusive is cleared.
     parseInt(f.is_premium) ? 0 : parseInt(f.is_members_only),
     parseInt(f.is_premium), parseInt(f.credits_required) || 1, f.relatedBlogsJson, f.coAuthorsJson, parseInt(f.send_notification_email),
     f.badge_expert_reviewed ? 1 : 0, f.badge_sap_notes_verified ? 1 : 0, f.badge_tested_s4hana ? 1 : 0, f.badge_field_validated ? 1 : 0, f.difficulty_level, f.newContentVersion, f.preview_paragraphs != null ? parseInt(f.preview_paragraphs) || null : null,
     ...publishParams, id]
  );
}

async function insertBlog(db, f) {
  await db.execute(
    `INSERT INTO blogs
     (id, title, slug, excerpt, content, author, author_id, date, image, image_alt, category, secondary_categories, tags, faqs,
      cta_title, cta_description, cta_button_text, cta_button_link,
      meta_title, meta_description, meta_keywords, schema_type, article_section,
      status, submission_status,
      seo_score, plagiarism_score, plagiarism_status, is_members_only, is_premium, credits_required, related_blogs, co_authors,
      send_notification_email, badge_expert_reviewed, badge_sap_notes_verified, badge_tested_s4hana, badge_field_validated, difficulty_level, content_version, preview_paragraphs,
      publish_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(NULLIF(?,''),CURRENT_DATE), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
             ?, ?,
             ?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?,
             ?, ?, ?, ?, ?, ?, ?, ?,
             ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [f.newId, f.title, f.slug, f.excerpt, f.content, f.authorName, f.author_id, f.date || '', f.image, f.image_alt || null, f.category, f.secondaryCatsJson, f.tags, f.faqsJson,
     f.cta_title, f.cta_description, f.cta_button_text, f.cta_button_link,
     f.meta_title, f.meta_description, f.meta_keywords,
     f.schema_type || 'BlogPosting', f.article_section || null,
     f.targetStatus, f.subStatus,
     f.seoScore, f.finalPlag, parseInt(f.is_members_only), parseInt(f.is_premium), parseInt(f.credits_required) || 1, f.relatedBlogsJson, f.coAuthorsJson,
     parseInt(f.send_notification_email),
     f.badge_expert_reviewed ? 1 : 0, f.badge_sap_notes_verified ? 1 : 0, f.badge_tested_s4hana ? 1 : 0, f.badge_field_validated ? 1 : 0, f.difficulty_level, '1.0', f.preview_paragraphs != null ? parseInt(f.preview_paragraphs) || null : null,
     f.publishDateVal]
  );
}

async function findForDelete(db, id) {
  const [rows] = await db.execute('SELECT author_id, image, content FROM blogs WHERE id = ? OR slug = ?', [id, id]);
  return rows[0] || null;
}

async function deleteBlogById(db, id) {
  await db.execute('DELETE FROM blogs WHERE id = ? OR slug = ?', [id, id]);
}

module.exports = {
  getExclusivePremiumCounts, findSuggestedCurrent, findSameCategoryCandidates, findCrossCategoryCandidates, findPopularFallback,
  updateBadges, findSingleBySlugOrId, hasUnlockedBlog, findUnlockedSlugsForMember, findList, findByIds, findAuthorDisplayName, slugExists, findExistingForUpdate,
  cascadeSlugChange, saveEditForReview, updateBlogStandard, insertBlog, findForDelete, deleteBlogById,
};
