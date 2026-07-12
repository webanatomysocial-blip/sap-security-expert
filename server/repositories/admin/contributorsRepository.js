async function findAllActive(db) {
  const [rows] = await db.execute(
    `SELECT c.*,
            c.full_name AS name,
            c.image     AS profile_image,
            u.id        AS user_id,
            u.username,
            u.is_active,
            u.email     AS user_email,
            COALESCE((
              SELECT COUNT(*)
              FROM blogs b
              WHERE b.author_id = u.id
                AND b.status IN ('approved','published')
            ), 0) AS blog_count
     FROM contributors c
     LEFT JOIN users u ON u.contributor_id = c.id
     WHERE c.is_deleted = 0 OR c.is_deleted IS NULL
     ORDER BY c.created_at DESC`
  );
  return rows;
}

async function findById(db, id) {
  const [rows] = await db.execute('SELECT * FROM contributors WHERE id = ?', [id]);
  return rows[0] || null;
}

async function updateStatus(db, id, status) {
  await db.execute('UPDATE contributors SET status=? WHERE id=?', [status, id]);
}

async function findUserByEmail(db, email) {
  const [rows] = await db.execute('SELECT id FROM users WHERE LOWER(email)=LOWER(?)', [email]);
  return rows[0] || null;
}

async function createUser(db, { username, email, hash, fullName, contributorId }) {
  const [result] = await db.execute(
    `INSERT INTO users (username, email, password, role, full_name, is_active, contributor_id, created_at)
     VALUES (?, ?, ?, 'contributor', ?, 1, ?, CURRENT_TIMESTAMP)`,
    [username, email, hash, fullName, contributorId]
  );
  return result.insertId;
}

async function activateUserForContributor(db, contributorId, email) {
  await db.execute('UPDATE users SET is_active=1, contributor_id=? WHERE LOWER(email)=LOWER(?)', [contributorId, email]);
}

async function findMemberByEmail(db, email) {
  const [rows] = await db.execute('SELECT id FROM members WHERE LOWER(email)=LOWER(?) LIMIT 1', [email]).catch(() => [[]]);
  return rows[0] || null;
}

async function findUserPasswordByEmail(db, email) {
  const [rows] = await db.execute('SELECT password FROM users WHERE LOWER(email)=LOWER(?) LIMIT 1', [email]).catch(() => [[]]);
  return rows[0] || null;
}

async function createMember(db, { name, email, passwordHash }) {
  await db.execute(
    "INSERT INTO members (name, email, password_hash, status, approved_at) VALUES (?, ?, ?, 'approved', CURRENT_TIMESTAMP)",
    [name, email, passwordHash]
  ).catch(() => {});
}

async function updateMemberPasswordByEmail(db, email, hash) {
  await db.execute('UPDATE members SET password_hash=? WHERE LOWER(email)=LOWER(?)', [hash, email]).catch(() => {});
}

async function detachUserFromContributor(db, contributorId) {
  await db.execute("UPDATE users SET contributor_id=NULL, role='member' WHERE contributor_id=?", [contributorId]).catch(() => {});
}

async function deleteContributor(db, id) {
  await db.execute('DELETE FROM contributors WHERE id=?', [id]);
}

async function findUserByContributorId(db, contributorId) {
  const [rows] = await db.execute('SELECT id, username, email, is_active FROM users WHERE contributor_id = ? LIMIT 1', [contributorId]);
  return rows[0] || null;
}

async function findPermissionsByUserId(db, userId) {
  const [rows] = await db.execute('SELECT * FROM user_permissions WHERE user_id = ? LIMIT 1', [userId]);
  return rows[0] || null;
}

// Shared by create-contributor-login and update-contributor-access — both
// call sites had byte-identical upsert logic in the original file.
async function upsertPermissions(db, userId, permissions) {
  const existing = await findPermissionsByUserId(db, userId);
  const values = [
    permissions.can_manage_blogs ? 1 : 0, permissions.can_manage_ads ? 1 : 0,
    permissions.can_manage_comments ? 1 : 0, permissions.can_manage_announcements ? 1 : 0,
    permissions.can_review_blogs ? 1 : 0, permissions.can_access_premium_articles ? 1 : 0,
  ];
  if (existing) {
    await db.execute(
      `UPDATE user_permissions SET can_manage_blogs=?, can_manage_ads=?, can_manage_comments=?,
       can_manage_announcements=?, can_review_blogs=?, can_access_premium_articles=? WHERE user_id=?`,
      [...values, userId]
    );
  } else {
    await db.execute(
      `INSERT INTO user_permissions (user_id, can_manage_blogs, can_manage_ads, can_manage_comments, can_manage_announcements, can_review_blogs, can_access_premium_articles)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, ...values]
    );
  }
}

async function updateUserPasswordAndContributor(db, userId, hash, contributorId) {
  await db.execute('UPDATE users SET password=?, is_active=1, contributor_id=? WHERE id=?', [hash, contributorId, userId]);
}

async function updateUserActive(db, userId, isActive) {
  await db.execute('UPDATE users SET is_active=? WHERE id=?', [isActive, userId]);
}

async function updateUserPassword(db, userId, hash) {
  await db.execute('UPDATE users SET password=? WHERE id=?', [hash, userId]);
}

async function findUserEmailById(db, userId) {
  const [rows] = await db.execute('SELECT email FROM users WHERE id=?', [userId]);
  return rows[0] || null;
}

async function findByIdWithContactEmail(db, id) {
  const [rows] = await db.execute(
    `SELECT c.*, COALESCE(u.email, c.email) AS contact_email
     FROM contributors c
     LEFT JOIN users u ON u.contributor_id = c.id
     WHERE c.id = ?`,
    [id]
  );
  return rows[0] || null;
}

module.exports = {
  findAllActive, findById, updateStatus, findUserByEmail, createUser, activateUserForContributor,
  findMemberByEmail, findUserPasswordByEmail, createMember, updateMemberPasswordByEmail,
  detachUserFromContributor, deleteContributor, findUserByContributorId, findPermissionsByUserId,
  upsertPermissions, updateUserPasswordAndContributor, updateUserActive, updateUserPassword,
  findUserEmailById, findByIdWithContactEmail,
};
