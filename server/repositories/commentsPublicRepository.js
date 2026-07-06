async function findApprovedByPostId(db, postId) {
  const [rows] = await db.execute(
    `SELECT c.id,
            c.post_id,
            c.parent_id,
            c.member_id,
            c.status,
            c.timestamp,
            COALESCE(m.name, c.user_name)  AS author,
            c.content                       AS text,
            p.id                            AS parent_db_id,
            p.member_id                     AS parent_member_id,
            COALESCE(pm.name, p.user_name)  AS parent_author,
            p.content                       AS parent_text,
            m.profile_visibility            AS member_visibility,
            pm.profile_visibility           AS parent_member_visibility
     FROM comments c
     LEFT JOIN comments p  ON c.parent_id = p.id
     LEFT JOIN members m   ON c.member_id = m.id
     LEFT JOIN members pm  ON p.member_id = pm.id
     WHERE c.post_id = ? AND c.status = 'approved'
     ORDER BY c.timestamp ASC`,
    [postId]
  );
  return rows;
}

async function findBlogBySlugOrId(db, postId) {
  const [rows] = await db.execute('SELECT title FROM blogs WHERE slug = ? OR id = ? LIMIT 1', [postId, postId]);
  return rows[0] || null;
}

async function findParentInSamePost(db, parentId, postId) {
  const [rows] = await db.execute('SELECT id FROM comments WHERE id = ? AND post_id = ? LIMIT 1', [parentId, postId]);
  return rows[0] || null;
}

async function findMemberNameAndVisibility(db, memberId) {
  const [rows] = await db.execute('SELECT name, profile_visibility FROM members WHERE id = ? LIMIT 1', [memberId]);
  return rows[0] || null;
}

async function insertComment(db, { postId, storedName, email, content, parentId, memberId }) {
  await db.execute(
    `INSERT INTO comments (post_id, user_name, email, content, parent_id, member_id, status, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
    [postId, storedName, email, content, parentId, memberId]
  );
}

module.exports = { findApprovedByPostId, findBlogBySlugOrId, findParentInSamePost, findMemberNameAndVisibility, insertComment };
