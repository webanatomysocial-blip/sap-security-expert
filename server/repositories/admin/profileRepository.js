async function findProfile(db, userId) {
  const [rows] = await db.execute(
    `SELECT u.id, u.username, u.email, u.full_name, u.role, u.bio, u.designation, u.linkedin,
            COALESCE(u.profile_image, c.image) AS profile_image
     FROM users u
     LEFT JOIN contributors c ON u.contributor_id = c.id
     WHERE u.id = ? LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

// Column names are hardcoded, never derived from request input — only the
// values are parameterized. Matches the pattern already verified safe
// elsewhere in this codebase (members.js, this file's own prior version).
async function updateProfile(db, userId, fields) {
  const updates = ['full_name=?', 'bio=?', 'designation=?', 'linkedin=?'];
  const params = [fields.full_name || null, fields.bio || null, fields.designation || null, fields.linkedin || null];

  if (fields.email) { updates.push('email=?'); params.push(fields.email); }
  if (fields.profile_image) { updates.push('profile_image=?'); params.push(fields.profile_image); }

  params.push(userId);
  await db.execute(`UPDATE users SET ${updates.join(',')} WHERE id=?`, params);
}

async function syncProfileImageToContributor(db, userId, image) {
  await db.execute(
    'UPDATE contributors SET image=? WHERE id=(SELECT contributor_id FROM users WHERE id=?)',
    [image, userId]
  );
}

async function syncProfileImageToMember(db, userId, image) {
  await db.execute(
    'UPDATE members SET profile_image=? WHERE LOWER(email)=(SELECT LOWER(email) FROM users WHERE id=?)',
    [image, userId]
  );
}

async function findProfileBasic(db, userId) {
  const [rows] = await db.execute(
    `SELECT u.id, u.username, u.email, u.full_name, u.role,
            COALESCE(u.profile_image, c.image) AS profile_image
     FROM users u LEFT JOIN contributors c ON u.contributor_id = c.id
     WHERE u.id=?`,
    [userId]
  );
  return rows[0] || null;
}

async function findAuthByUserId(db, userId) {
  const [rows] = await db.execute('SELECT email, password FROM users WHERE id = ?', [userId]);
  return rows[0] || null;
}

async function updatePassword(db, userId, hash) {
  await db.execute('UPDATE users SET password=? WHERE id=?', [hash, userId]);
}

async function syncPasswordToMember(db, email, hash) {
  await db.execute('UPDATE members SET password_hash=? WHERE LOWER(email)=LOWER(?)', [hash, email]);
}

module.exports = {
  findProfile, updateProfile, syncProfileImageToContributor, syncProfileImageToMember,
  findProfileBasic, findAuthByUserId, updatePassword, syncPasswordToMember,
};
