// Author fields match what BlogPreviewModal expects: author_name, author_image, author_bio
const AUTHOR_FIELDS = `
  COALESCE(c.full_name, u.username) AS author_display,
  CASE
    WHEN u.role = 'admin' OR b.author_id IS NULL OR b.author_id = 1 THEN 'Raghu Boddu'
    ELSE COALESCE(c.full_name, u.full_name, u.username, b.author)
  END AS author_name,
  CASE
    WHEN u.role = 'admin' OR b.author_id IS NULL OR b.author_id = 1 THEN '/assets/raghu_boddu.png'
    ELSE COALESCE(c.image, u.profile_image)
  END AS author_image,
  COALESCE(c.short_bio, u.bio, 'Expert SAP Security Contributor.') AS author_bio,
  COALESCE(c.designation, u.designation) AS author_designation,
  COALESCE(c.linkedin, u.linkedin) AS author_linkedin`;

async function findPendingByStatus(db, status, { isAdmin, reviewerId }) {
  // Non-admin reviewers must not see their own submitted blogs in the queue.
  const selfExclude = (!isAdmin && reviewerId) ? ` AND (b.author_id IS NULL OR b.author_id != ?)` : '';
  const params = (!isAdmin && reviewerId) ? [reviewerId] : [];

  let sql;
  if (status === 'rejected') {
    sql = `SELECT b.*, ${AUTHOR_FIELDS}
           FROM blogs b
           LEFT JOIN users u ON b.author_id = u.id
           LEFT JOIN contributors c ON u.contributor_id = c.id
           WHERE b.submission_status = 'rejected'${selfExclude}
           ORDER BY b.updated_at DESC`;
  } else if (status === 'edited') {
    sql = `SELECT b.*, ${AUTHOR_FIELDS}
           FROM blogs b
           LEFT JOIN users u ON b.author_id = u.id
           LEFT JOIN contributors c ON u.contributor_id = c.id
           WHERE b.submission_status = 'edited'${selfExclude}
           ORDER BY b.updated_at DESC`;
  } else {
    sql = `SELECT b.*, ${AUTHOR_FIELDS}
           FROM blogs b
           LEFT JOIN users u ON b.author_id = u.id
           LEFT JOIN contributors c ON u.contributor_id = c.id
           WHERE b.submission_status IN ('submitted','edited')${selfExclude}
           ORDER BY b.created_at DESC`;
  }

  const [rows] = await db.execute(sql, params);
  return rows;
}

async function findByIdWithAuthorEmail(db, id) {
  const [rows] = await db.execute(
    `SELECT b.*, u.email AS author_email, COALESCE(c.full_name, u.username) AS author_name
     FROM blogs b
     LEFT JOIN users u ON b.author_id = u.id
     LEFT JOIN contributors c ON u.contributor_id = c.id
     WHERE b.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function approveEditedBlog(db, id) {
  await db.execute(
    `UPDATE blogs SET
     title=COALESCE(draft_title,title), excerpt=COALESCE(draft_excerpt,excerpt),
     content=COALESCE(draft_content,content), image=COALESCE(draft_image,image),
     image_alt=COALESCE(draft_image_alt,image_alt),
     category=COALESCE(draft_category,category), faqs=COALESCE(draft_faqs,faqs),
     secondary_categories=COALESCE(draft_secondary_categories,secondary_categories),
     meta_title=COALESCE(draft_meta_title,meta_title), meta_description=COALESCE(draft_meta_description,meta_description),
     meta_keywords=COALESCE(draft_meta_keywords,meta_keywords),
     cta_title=COALESCE(draft_cta_title,cta_title), cta_description=COALESCE(draft_cta_description,cta_description),
     cta_button_text=COALESCE(draft_cta_button_text,cta_button_text), cta_button_link=COALESCE(draft_cta_button_link,cta_button_link),
     draft_title=NULL, draft_excerpt=NULL, draft_content=NULL, draft_image=NULL, draft_image_alt=NULL,
     draft_category=NULL, draft_faqs=NULL, draft_secondary_categories=NULL,
     draft_meta_title=NULL, draft_meta_description=NULL,
     draft_meta_keywords=NULL, draft_cta_title=NULL, draft_cta_description=NULL,
     draft_cta_button_text=NULL, draft_cta_button_link=NULL,
     submission_status='approved', status='approved', rejection_feedback=NULL,
     updated_at=CURRENT_TIMESTAMP
     WHERE id=?`,
    [id]
  );
}

async function approveDirectBlog(db, id) {
  await db.execute(
    `UPDATE blogs SET submission_status='approved', status='approved',
     rejection_feedback=NULL, publish_date=COALESCE(publish_date,CURRENT_TIMESTAMP),
     updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [id]
  );
}

async function rejectBlog(db, id, reason) {
  await db.execute(
    `UPDATE blogs SET submission_status='rejected', status='rejected',
     rejection_feedback=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [reason, id]
  );
}

async function moveToDraft(db, id, reason) {
  await db.execute(
    `UPDATE blogs SET submission_status='draft', status='draft',
     rejection_feedback=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [reason, id]
  );
}

async function findMemberIdByEmail(db, email) {
  const [rows] = await db.execute('SELECT id FROM members WHERE LOWER(email)=LOWER(?) LIMIT 1', [email]);
  return rows[0] || null;
}

async function findByIdWithContent(db, id) {
  const [rows] = await db.execute('SELECT id, content FROM blogs WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function updatePlagiarismScore(db, id, score) {
  await db.execute(
    "UPDATE blogs SET plagiarism_score=?, plagiarism_status='completed', updated_at=CURRENT_TIMESTAMP WHERE id=?",
    [score, id]
  );
}

async function findBlogsNeedingPlagiarismRecalc(db) {
  const [rows] = await db.execute(
    "SELECT id, content FROM blogs WHERE plagiarism_score IS NULL OR plagiarism_score = 0 OR plagiarism_score = -1"
  );
  return rows;
}

async function findIsPremiumById(db, id) {
  const [[row]] = await db.execute('SELECT is_premium FROM blogs WHERE id=?', [id]);
  return row || null;
}

async function updateExclusive(db, id, isMembersOnly, previewParagraphs) {
  if (isMembersOnly) {
    // Enabling exclusive: clear is_premium (mutually exclusive flags — a blog
    // cannot be both. If it was premium, any member who had it unlocked via
    // credits would still own the unlock, but new visitors would see the
    // members-only gate instead of the credit paywall, which is the correct
    // intent when the admin explicitly switches from premium to exclusive).
    const pp = previewParagraphs != null ? parseInt(previewParagraphs) || null : null;
    await db.execute(
      'UPDATE blogs SET is_members_only=1, is_premium=0, preview_paragraphs=? WHERE id=?',
      [pp, id]
    );
  } else {
    await db.execute('UPDATE blogs SET is_members_only=0 WHERE id=?', [id]);
  }
}

async function updatePremium(db, id, isPremium, creditsRequired) {
  // Premium and Exclusive are mutually exclusive content tiers — switching a
  // blog to Premium must clear any lingering is_members_only flag, otherwise
  // the row is left in an inconsistent dual-flagged state (the admin list UI
  // optimistically displayed Exclusive as cleared, but the DB never was).
  if (isPremium && creditsRequired != null) {
    await db.execute('UPDATE blogs SET is_premium=?, is_members_only=0, credits_required=? WHERE id=?', [1, creditsRequired, id]);
  } else if (isPremium) {
    await db.execute('UPDATE blogs SET is_premium=?, is_members_only=0 WHERE id=?', [isPremium, id]);
  } else {
    await db.execute('UPDATE blogs SET is_premium=? WHERE id=?', [isPremium, id]);
  }
}

async function updateExpertPick(db, id, isExpertPick) {
  await db.execute('UPDATE blogs SET is_expert_pick=? WHERE id=?', [isExpertPick, id]);
}

async function findSelectList(db) {
  const [rows] = await db.execute(
    `SELECT id, title, slug, category FROM blogs
     WHERE status IN ('approved','published') AND (type IS NULL OR type = 'blog')
     ORDER BY title ASC`
  );
  return rows;
}

module.exports = {
  findPendingByStatus, findByIdWithAuthorEmail, approveEditedBlog, approveDirectBlog, rejectBlog, moveToDraft,
  findMemberIdByEmail, findByIdWithContent, updatePlagiarismScore, findBlogsNeedingPlagiarismRecalc,
  findIsPremiumById, updateExclusive, updatePremium, updateExpertPick, findSelectList,
};
