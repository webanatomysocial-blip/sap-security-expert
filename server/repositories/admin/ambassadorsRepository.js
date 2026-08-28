async function findAllActive(db) {
  const [rows] = await db.execute(
    `SELECT a.*,
            a.full_name AS name,
            a.image     AS profile_image,
            u.id        AS user_id,
            u.username,
            u.is_active,
            u.email     AS user_email,
            u.last_login,
            u.login_count,
            COALESCE((
              SELECT COUNT(*)
              FROM blogs b
              WHERE b.author_id = u.id
                AND b.status IN ('approved','published')
            ), 0) AS blog_count,
            (
              SELECT MAX(b.date)
              FROM blogs b
              WHERE b.author_id = u.id
                AND b.status IN ('approved','published')
            ) AS last_contribution,
            COALESCE((
              SELECT COUNT(*)
              FROM blogs b
              WHERE b.author_id = u.id
                AND b.status IN ('approved','published')
                AND b.category = 'expert-papers'
            ), 0) AS expert_papers_count
     FROM ambassadors a
     LEFT JOIN users u ON u.ambassador_id = a.id
     WHERE a.is_deleted = 0 OR a.is_deleted IS NULL
     ORDER BY a.created_at DESC`
  );
  return rows;
}

async function findById(db, id) {
  const [rows] = await db.execute('SELECT * FROM ambassadors WHERE id = ?', [id]);
  return rows[0] || null;
}

async function approveAmbassador(db, id) {
  await db.execute("UPDATE ambassadors SET status='approved', approved_at=CURRENT_TIMESTAMP WHERE id=?", [id]);
}

async function updateStatus(db, id, status) {
  await db.execute('UPDATE ambassadors SET status=? WHERE id=?', [status, id]);
}

// Deactivating only revokes the ambassador dashboard session (users.is_active
// gates that in membersController.login) and leaves the `members` row
// untouched, so the person can still sign in as a regular member.
async function deactivateAmbassador(db, id) {
  await db.execute("UPDATE ambassadors SET status='deactivated' WHERE id=?", [id]);
  await db.execute("UPDATE users SET is_active=0 WHERE ambassador_id=?", [id]).catch(() => {});
}

async function reactivateAmbassador(db, id) {
  await db.execute("UPDATE ambassadors SET status='approved', approved_at=CURRENT_TIMESTAMP WHERE id=?", [id]);
  await db.execute("UPDATE users SET is_active=1 WHERE ambassador_id=?", [id]).catch(() => {});
}

// Only one ambassador per country can hold the badge at a time — granting it
// to one revokes it from whoever currently holds it in the same country.
async function grantBadge(db, id, year) {
  const ambassador = await findById(db, id);
  if (!ambassador) return;
  if (ambassador.country) {
    await db.execute("UPDATE ambassadors SET has_badge=0, badge_year=NULL WHERE country=? AND id<>?", [ambassador.country, id]);
  }
  await db.execute("UPDATE ambassadors SET has_badge=1, badge_year=? WHERE id=?", [year, id]);

  // Log this grant permanently — re-granting the same country+year (e.g. an
  // admin correcting who it went to) overwrites that year's row rather than
  // duplicating it, since exactly one ambassador can hold a given
  // country+year. VALUES(ambassador_id) (not a bound param) keeps the param
  // count identical after translateSQL() strips this clause for SQLite —
  // same pattern as settingsRepository.js's upsert.
  if (ambassador.country) {
    await db.execute(
      `INSERT INTO ambassador_badge_history (ambassador_id, country, badge_year, granted_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE ambassador_id = VALUES(ambassador_id), granted_at = CURRENT_TIMESTAMP`,
      [id, ambassador.country, year]
    );
  }
}

async function findBadgeHistoryByCountry(db, country) {
  const [rows] = await db.execute(
    `SELECT h.badge_year, h.granted_at, a.id AS ambassador_id, a.full_name
     FROM ambassador_badge_history h
     JOIN ambassadors a ON a.id = h.ambassador_id
     WHERE h.country = ?
     ORDER BY h.badge_year DESC`,
    [country]
  );
  return rows;
}

async function revokeBadge(db, id) {
  await db.execute("UPDATE ambassadors SET has_badge=0, badge_year=NULL WHERE id=?", [id]);
}

async function findUserByEmail(db, email) {
  const [rows] = await db.execute('SELECT id FROM users WHERE LOWER(email)=LOWER(?)', [email]);
  return rows[0] || null;
}

async function createUser(db, { username, email, hash, fullName, ambassadorId }) {
  const [result] = await db.execute(
    `INSERT INTO users (username, email, password, role, full_name, is_active, ambassador_id, created_at)
     VALUES (?, ?, ?, 'contributor', ?, 1, ?, CURRENT_TIMESTAMP)`,
    [username, email, hash, fullName, ambassadorId]
  );
  return result.insertId;
}

async function activateUserForAmbassador(db, ambassadorId, email) {
  await db.execute('UPDATE users SET is_active=1, ambassador_id=? WHERE LOWER(email)=LOWER(?)', [ambassadorId, email]);
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

async function detachUserFromAmbassador(db, ambassadorId) {
  await db.execute("UPDATE users SET ambassador_id=NULL, role='member' WHERE ambassador_id=?", [ambassadorId]).catch(() => {});
}

async function deleteAmbassador(db, id) {
  await db.execute('DELETE FROM ambassadors WHERE id=?', [id]);
}

async function findUserByAmbassadorId(db, ambassadorId) {
  const [rows] = await db.execute('SELECT id, username, email, is_active FROM users WHERE ambassador_id = ? LIMIT 1', [ambassadorId]);
  return rows[0] || null;
}

async function findPermissionsByUserId(db, userId) {
  const [rows] = await db.execute('SELECT * FROM user_permissions WHERE user_id = ? LIMIT 1', [userId]);
  return rows[0] || null;
}

// Shared shape with contributorsRepository.upsertPermissions — kept as a
// separate copy rather than a shared import so the two admin flows can
// diverge independently later without coupling.
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

async function updateUserPasswordAndAmbassador(db, userId, hash, ambassadorId) {
  await db.execute('UPDATE users SET password=?, is_active=1, ambassador_id=? WHERE id=?', [hash, ambassadorId, userId]);
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

async function findUserWithAmbassadorNameById(db, userId) {
  const [rows] = await db.execute(
    `SELECT u.email, a.full_name
     FROM users u LEFT JOIN ambassadors a ON a.id = u.ambassador_id
     WHERE u.id = ? LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

module.exports = {
  findAllActive, findById, approveAmbassador, updateStatus, deactivateAmbassador, reactivateAmbassador,
  grantBadge, revokeBadge, findBadgeHistoryByCountry,
  findUserByEmail, createUser, activateUserForAmbassador,
  findMemberByEmail, findUserPasswordByEmail, createMember, updateMemberPasswordByEmail,
  detachUserFromAmbassador, deleteAmbassador,
  findUserByAmbassadorId, findPermissionsByUserId, upsertPermissions,
  updateUserPasswordAndAmbassador, updateUserActive, updateUserPassword, findUserEmailById,
  findUserWithAmbassadorNameById,
};
