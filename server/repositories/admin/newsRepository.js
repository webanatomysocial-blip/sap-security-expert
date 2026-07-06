async function findAllNews(db) {
  const [rows] = await db.execute(
    `SELECT id, title, slug, excerpt, content, image, image_alt, status, date,
            created_at, updated_at, view_count,
            tags, faqs,
            cta_title, cta_description, cta_button_text, cta_button_link,
            meta_title, meta_description, meta_keywords
     FROM blogs
     WHERE \`type\` = 'news'
     ORDER BY created_at DESC`
  );
  return rows;
}

async function slugExists(db, slug, excludeId) {
  const [rows] = await db.execute('SELECT id FROM blogs WHERE slug = ? AND id != ?', [slug, excludeId || '']);
  return rows.length > 0;
}

async function findNewsById(db, id) {
  const [rows] = await db.execute('SELECT id, image FROM blogs WHERE id = ? AND `type` = ?', [id, 'news']);
  return rows[0] || null;
}

async function updateNews(db, id, fields) {
  const {
    title, slug, excerpt, content, date, image, image_alt, tags, faqsJson,
    cta_title, cta_description, cta_button_text, cta_button_link,
    meta_title, meta_description, meta_keywords, targetStatus,
  } = fields;
  await db.execute(
    `UPDATE blogs SET
     title=?, slug=?, excerpt=?, content=?, date=COALESCE(NULLIF(?,''),CURRENT_DATE),
     image=?, image_alt=?, category='news', tags=?, faqs=?,
     cta_title=?, cta_description=?, cta_button_text=?, cta_button_link=?,
     meta_title=?, meta_description=?, meta_keywords=?,
     status=?, submission_status=?,
     updated_at=CURRENT_TIMESTAMP
     WHERE id=? AND \`type\`='news'`,
    [title, slug, excerpt, content, date || '', image, image_alt || null, tags, faqsJson,
     cta_title, cta_description, cta_button_text, cta_button_link,
     meta_title, meta_description, meta_keywords,
     targetStatus, targetStatus, id]
  );
}

async function createNews(db, newId, fields) {
  const {
    title, slug, excerpt, content, adminName, adminId, date, image, image_alt,
    tags, faqsJson, cta_title, cta_description, cta_button_text, cta_button_link,
    meta_title, meta_description, meta_keywords, targetStatus, publishDate,
  } = fields;
  await db.execute(
    `INSERT INTO blogs
     (id, title, slug, excerpt, content, author, author_id, date, image, image_alt,
      category, \`type\`, tags, faqs,
      cta_title, cta_description, cta_button_text, cta_button_link,
      meta_title, meta_description, meta_keywords,
      status, submission_status, seo_score, plagiarism_score, plagiarism_status,
      is_members_only, send_notification_email, publish_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(NULLIF(?,''),CURRENT_DATE), ?, ?,
             'news', 'news', ?, ?,
             ?, ?, ?, ?,
             ?, ?, ?,
             ?, ?, 0, 0, 'completed',
             0, 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [newId, title, slug, excerpt, content, adminName, adminId, date || '', image, image_alt || null,
     tags, faqsJson,
     cta_title, cta_description, cta_button_text, cta_button_link,
     meta_title, meta_description, meta_keywords,
     targetStatus, targetStatus, publishDate]
  );
}

async function findByIdOrSlugForDelete(db, id) {
  const [rows] = await db.execute(
    "SELECT image FROM blogs WHERE (id = ? OR slug = ?) AND `type` = 'news'",
    [id, id]
  );
  return rows[0] || null;
}

async function deleteNews(db, id) {
  await db.execute("DELETE FROM blogs WHERE (id = ? OR slug = ?) AND `type` = 'news'", [id, id]);
}

module.exports = { findAllNews, slugExists, findNewsById, updateNews, createNews, findByIdOrSlugForDelete, deleteNews };
