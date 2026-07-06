async function findAllLearnings(db) {
  const [rows] = await db.execute(
    `SELECT id, title, slug, excerpt, content, image, image_alt, category,
            secondary_categories, tags, faqs, status, submission_status,
            date, created_at, updated_at, view_count, seo_score, plagiarism_score,
            co_authors, related_blogs, schema_type, article_section,
            meta_title, meta_description, meta_keywords,
            cta_title, cta_description, cta_button_text, cta_button_link,
            is_members_only, send_notification_email,
            author, author_id
     FROM blogs
     WHERE \`type\` = 'learning'
     ORDER BY created_at DESC`
  );
  return rows;
}

async function slugExists(db, slug, excludeId) {
  const [rows] = await db.execute('SELECT id FROM blogs WHERE slug = ? AND id != ?', [slug, excludeId || '']);
  return rows.length > 0;
}

async function findLearningById(db, id) {
  const [rows] = await db.execute("SELECT id FROM blogs WHERE id = ? AND `type` = 'learning'", [id]);
  return rows[0] || null;
}

async function updateLearning(db, id, fields) {
  const {
    title, slug, excerpt, content, category, secondaryCatsJson, date, image, image_alt, tags, faqsJson,
    cta_title, cta_description, cta_button_text, cta_button_link,
    meta_title, meta_description, meta_keywords, schema_type, article_section,
    coAuthorsJson, relatedBlogsJson, seo_score, is_members_only, send_notification_email, targetStatus,
  } = fields;
  await db.execute(
    `UPDATE blogs SET
     title=?, slug=?, excerpt=?, content=?, category=?,
     secondary_categories=?,
     date=COALESCE(NULLIF(?,''),CURRENT_DATE),
     image=?, image_alt=?, tags=?, faqs=?,
     cta_title=?, cta_description=?, cta_button_text=?, cta_button_link=?,
     meta_title=?, meta_description=?, meta_keywords=?,
     schema_type=?, article_section=?,
     co_authors=?, related_blogs=?,
     seo_score=?, is_members_only=?, send_notification_email=?,
     status=?, submission_status=?,
     updated_at=CURRENT_TIMESTAMP
     WHERE id=? AND \`type\`='learning'`,
    [title, slug, excerpt, content, category,
     secondaryCatsJson,
     date || '', image, image_alt || null, tags, faqsJson,
     cta_title, cta_description, cta_button_text, cta_button_link,
     meta_title, meta_description, meta_keywords,
     schema_type || 'Article', article_section || null,
     coAuthorsJson, relatedBlogsJson,
     seo_score, is_members_only ? 1 : 0, send_notification_email ? 1 : 0,
     targetStatus, targetStatus, id]
  );
}

async function createLearning(db, newId, fields) {
  const {
    title, slug, excerpt, content, adminName, adminId, date, image, image_alt,
    category, secondaryCatsJson, tags, faqsJson,
    cta_title, cta_description, cta_button_text, cta_button_link,
    meta_title, meta_description, meta_keywords,
    schema_type, article_section, coAuthorsJson, relatedBlogsJson,
    seo_score, targetStatus, is_members_only, send_notification_email, publishDate,
  } = fields;
  await db.execute(
    `INSERT INTO blogs
     (id, title, slug, excerpt, content, author, author_id, date, image, image_alt,
      category, secondary_categories, \`type\`, tags, faqs,
      cta_title, cta_description, cta_button_text, cta_button_link,
      meta_title, meta_description, meta_keywords,
      schema_type, article_section, co_authors, related_blogs,
      seo_score, plagiarism_score, plagiarism_status,
      status, submission_status,
      is_members_only, send_notification_email,
      publish_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?,
             COALESCE(NULLIF(?,''),CURRENT_DATE), ?, ?,
             ?, ?, 'learning', ?, ?,
             ?, ?, ?, ?,
             ?, ?, ?,
             ?, ?, ?, ?,
             ?, 0, 'completed',
             ?, ?,
             ?, ?,
             ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [newId, title, slug, excerpt, content, adminName, adminId,
     date || '', image, image_alt || null,
     category, secondaryCatsJson, tags, faqsJson,
     cta_title, cta_description, cta_button_text, cta_button_link,
     meta_title, meta_description, meta_keywords,
     schema_type || 'Article', article_section || null, coAuthorsJson, relatedBlogsJson,
     seo_score,
     targetStatus, targetStatus,
     is_members_only ? 1 : 0, send_notification_email ? 1 : 0,
     publishDate]
  );
}

async function findByIdOrSlugForDelete(db, id) {
  const [rows] = await db.execute(
    "SELECT image FROM blogs WHERE (id = ? OR slug = ?) AND `type` = 'learning'",
    [id, id]
  );
  return rows[0] || null;
}

async function deleteLearning(db, id) {
  await db.execute("DELETE FROM blogs WHERE (id = ? OR slug = ?) AND `type` = 'learning'", [id, id]);
}

module.exports = { findAllLearnings, slugExists, findLearningById, updateLearning, createLearning, findByIdOrSlugForDelete, deleteLearning };
