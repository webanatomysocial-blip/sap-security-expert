async function findMemberStatusByEmail(db, email) {
  const [rows] = await db.execute('SELECT id, status, is_deleted FROM members WHERE LOWER(email) = LOWER(?) LIMIT 1', [email]);
  return rows[0] || null;
}

async function findActiveMemberByEmail(db, email) {
  const [rows] = await db.execute('SELECT id FROM members WHERE LOWER(email) = LOWER(?) AND is_deleted = 0 LIMIT 1', [email]);
  return rows[0] || null;
}

async function findActiveUserByEmail(db, email) {
  const [rows] = await db.execute('SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND is_active = 1 LIMIT 1', [email]);
  return rows[0] || null;
}

async function findMemberNameByEmail(db, email) {
  const [rows] = await db.execute('SELECT name FROM members WHERE LOWER(email) = LOWER(?) LIMIT 1', [email]);
  return rows[0] || null;
}

async function findUserNameByEmail(db, email) {
  const [rows] = await db.execute('SELECT full_name AS name FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1', [email]);
  return rows[0] || null;
}

async function findMemberIdAndNameByEmail(db, email) {
  const [rows] = await db.execute('SELECT id, name FROM members WHERE LOWER(email) = LOWER(?) AND is_deleted = 0 LIMIT 1', [email]);
  return rows[0] || null;
}

async function findActiveUserIdAndNameByEmail(db, email) {
  const [rows] = await db.execute('SELECT id, full_name AS name FROM users WHERE LOWER(email) = LOWER(?) AND is_active = 1 LIMIT 1', [email]);
  return rows[0] || null;
}

async function upsertResetToken(db, email, token, expiry) {
  await db.execute(
    'INSERT INTO password_reset_tokens (email, token, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE token=VALUES(token), expires_at=VALUES(expires_at)',
    [email, token, expiry]
  );
}

async function findValidResetToken(db, email, token) {
  const [rows] = await db.execute(
    'SELECT id FROM password_reset_tokens WHERE email = ? AND token = ? AND expires_at >= NOW()',
    [email, token]
  );
  return rows[0] || null;
}

async function updateMemberPassword(db, email, hash) {
  await db.execute('UPDATE members SET password_hash = ? WHERE LOWER(email) = LOWER(?)', [hash, email]);
}

async function updateUserPassword(db, email, hash) {
  await db.execute('UPDATE users SET password = ? WHERE LOWER(email) = LOWER(?)', [hash, email]);
}

async function deleteResetTokensByEmail(db, email) {
  await db.execute('DELETE FROM password_reset_tokens WHERE LOWER(email) = LOWER(?)', [email]);
}

module.exports = {
  findMemberStatusByEmail, findActiveMemberByEmail, findActiveUserByEmail,
  findMemberNameByEmail, findUserNameByEmail, findMemberIdAndNameByEmail, findActiveUserIdAndNameByEmail,
  upsertResetToken, findValidResetToken, updateMemberPassword, updateUserPassword, deleteResetTokensByEmail,
};
