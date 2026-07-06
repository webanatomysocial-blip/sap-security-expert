async function findAllAdmins(db) {
  const [rows] = await db.execute(
    `SELECT id, username, email, full_name, is_active, created_at
     FROM users WHERE role = 'admin'
     ORDER BY created_at DESC`
  );
  return rows;
}

async function findUserByEmail(db, email) {
  const [rows] = await db.execute('SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1', [email]);
  return rows[0] || null;
}

async function createAdmin(db, { username, email, hash, fullName }) {
  const [result] = await db.execute(
    `INSERT INTO users (username, email, password, role, full_name, is_active, created_at)
     VALUES (?, ?, ?, 'admin', ?, 1, CURRENT_TIMESTAMP)`,
    [username, email, hash, fullName]
  );
  return result.insertId;
}

async function findAdminById(db, id) {
  const [rows] = await db.execute(`SELECT id, email, full_name, is_active FROM users WHERE id = ? AND role = 'admin' LIMIT 1`, [id]);
  return rows[0] || null;
}

async function updateAdminActive(db, id, isActive) {
  await db.execute(`UPDATE users SET is_active = ? WHERE id = ? AND role = 'admin'`, [isActive, id]);
}

async function updateAdminPassword(db, id, hash) {
  await db.execute(`UPDATE users SET password = ? WHERE id = ? AND role = 'admin'`, [hash, id]);
}

module.exports = {
  findAllAdmins, findUserByEmail, createAdmin, findAdminById, updateAdminActive, updateAdminPassword,
};
