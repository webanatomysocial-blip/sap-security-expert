async function findLoginAttempts(db, ip) {
  const [rows] = await db.execute('SELECT attempts, last_attempt FROM login_attempts WHERE ip = ?', [ip]);
  return rows[0] || null;
}

async function clearLoginAttempts(db, ip) {
  await db.execute('DELETE FROM login_attempts WHERE ip = ?', [ip]);
}

async function recordFailedAttempt(db, ip, now) {
  const [existing] = await db.execute('SELECT ip FROM login_attempts WHERE ip = ?', [ip]);
  if (existing.length) {
    await db.execute('UPDATE login_attempts SET attempts = attempts + 1, last_attempt = ? WHERE ip = ?', [now, ip]);
  } else {
    await db.execute('INSERT INTO login_attempts (ip, attempts, last_attempt) VALUES (?, 1, ?)', [ip, now]);
  }
}

async function findUserByUsername(db, username) {
  const [rows] = await db.execute('SELECT * FROM users WHERE username = ? LIMIT 1', [username]);
  return rows[0] || null;
}

// Exact original query used by /login — LIMIT 1.
async function findPermissionsByUserId(db, userId) {
  const [rows] = await db.execute('SELECT * FROM user_permissions WHERE user_id = ? LIMIT 1', [userId]);
  return rows[0] || null;
}

// Exact original query used by /verify-session — no LIMIT. Kept as a
// separate function (not deduped with the one above) to avoid changing
// either call site's exact query text.
async function findPermissionsByUserIdAll(db, userId) {
  const [rows] = await db.execute('SELECT * FROM user_permissions WHERE user_id = ?', [userId]);
  return rows[0] || null;
}

async function findUserById(db, id) {
  const [rows] = await db.execute(
    'SELECT id, username, role, full_name, profile_image FROM users WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function findContributorByEmail(db, email) {
  const [rows] = await db.execute(
    "SELECT * FROM users WHERE email = ? AND role = 'contributor' AND is_active = 1 LIMIT 1",
    [email]
  );
  return rows[0] || null;
}

module.exports = {
  findLoginAttempts, clearLoginAttempts, recordFailedAttempt, findUserByUsername,
  findPermissionsByUserId, findPermissionsByUserIdAll, findUserById, findContributorByEmail,
};
