async function findAllWithContext(db) {
  const [rows] = await db.execute(
    `SELECT c.id, c.post_id, c.parent_id, c.member_id, c.status,
            c.rejection_reason, c.original_text, c.edited_at, c.timestamp,
            c.user_name AS author, c.email, c.content AS text, c.timestamp AS date,
            b.slug,
            p.user_name AS parent_author, p.content AS parent_text
     FROM comments c
     LEFT JOIN blogs b ON (c.post_id = b.id OR c.post_id = b.slug)
     LEFT JOIN comments p ON c.parent_id = p.id
     ORDER BY c.timestamp DESC`
  );
  return rows;
}

async function findContentById(db, id) {
  const [rows] = await db.execute('SELECT content, original_text FROM comments WHERE id=?', [id]);
  return rows[0] || null;
}

async function updateContent(db, id, content, originalText) {
  await db.execute(
    'UPDATE comments SET content=?, original_text=?, edited_at=CURRENT_TIMESTAMP WHERE id=?',
    [content, originalText, id]
  );
}

async function updateStatus(db, id, status, rejectionReason) {
  await db.execute('UPDATE comments SET status=?, rejection_reason=? WHERE id=?', [status, rejectionReason || null, id]);
}

async function findAuthorInfoById(db, id) {
  const [rows] = await db.execute('SELECT user_name, email, member_id FROM comments WHERE id=?', [id]);
  return rows[0] || null;
}

async function countApprovedByMember(db, memberId) {
  const [rows] = await db.execute(
    "SELECT COUNT(*) as cnt FROM comments WHERE member_id = ? AND status = 'approved'",
    [memberId]
  );
  return rows[0]?.cnt || 0;
}

async function grantAchievement(db, memberId, achievementId) {
  await db.execute(
    'INSERT IGNORE INTO member_achievements (member_id, achievement_id) VALUES (?, ?)',
    [memberId, achievementId]
  );
}

async function remove(db, id) {
  await db.execute('DELETE FROM comments WHERE id=?', [id]);
}

module.exports = {
  findAllWithContext, findContentById, updateContent, updateStatus,
  findAuthorInfoById, countApprovedByMember, grantAchievement, remove,
};
