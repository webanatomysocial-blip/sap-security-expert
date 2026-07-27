const { isSQLite } = require('../db');

// ── Login ─────────────────────────────────────────────────────────────────
async function findMemberByEmailOrUsername(db, emailInput) {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM members WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?) LIMIT 1',
      [emailInput, emailInput]
    );
    return rows[0] || null;
  } catch (_) {
    // Fallback: username column may not exist in prod yet (run migration to fix)
    const [rows] = await db.execute(
      'SELECT * FROM members WHERE LOWER(email) = LOWER(?) LIMIT 1',
      [emailInput]
    );
    return rows[0] || null;
  }
}

async function findUserByEmailOrUsername(db, emailInput) {
  const [rows] = await db.execute(
    'SELECT * FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?) LIMIT 1',
    [emailInput, emailInput]
  );
  return rows[0] || null;
}

async function findContributorByEmail(db, email) {
  const [rows] = await db.execute('SELECT * FROM contributors WHERE LOWER(email) = LOWER(?) LIMIT 1', [email]);
  return rows[0] || null;
}

async function findContributorById(db, id) {
  const [rows] = await db.execute('SELECT * FROM contributors WHERE id = ?', [id]);
  return rows[0] || null;
}

async function findMemberByEmailExact(db, email) {
  const [rows] = await db.execute('SELECT * FROM members WHERE LOWER(email) = LOWER(?) LIMIT 1', [email]);
  return rows[0] || null;
}

async function createMemberLazy(db, { name, email, passwordHash }) {
  await db.execute(
    "INSERT INTO members (name, email, password_hash, status, approved_at) VALUES (?, ?, ?, 'approved', CURRENT_TIMESTAMP)",
    [name, email, passwordHash]
  );
}

async function findMemberByEmailExactRaw(db, email) {
  const [rows] = await db.execute('SELECT * FROM members WHERE email = ? LIMIT 1', [email]);
  return rows[0] || null;
}

async function findPermissionsByUserId(db, userId) {
  const [rows] = await db.execute('SELECT * FROM user_permissions WHERE user_id = ?', [userId]);
  return rows[0] || null;
}

async function findActiveSubscription(db, memberId) {
  const [rows] = await db.execute(
    "SELECT s.expires_at, p.name as plan_name FROM member_subscriptions s JOIN membership_plans p ON p.id = s.plan_id WHERE s.member_id = ? AND s.status = 'active' AND s.expires_at > NOW() ORDER BY s.expires_at DESC LIMIT 1",
    [memberId]
  ).catch(() => [[]]);
  return rows[0] || null;
}

// ── Signup ────────────────────────────────────────────────────────────────
async function findMemberStatusByEmail(db, email) {
  const [rows] = await db.execute('SELECT id, status, is_deleted FROM members WHERE email = ? LIMIT 1', [email]);
  return rows[0] || null;
}

async function userExistsByEmail(db, email) {
  const [rows] = await db.execute('SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1', [email]);
  return rows.length > 0;
}

async function memberExistsByUsername(db, username) {
  const [rows] = await db.execute('SELECT id FROM members WHERE LOWER(username) = LOWER(?) LIMIT 1', [username]);
  return rows.length > 0;
}

async function userExistsByUsername(db, username) {
  const [rows] = await db.execute('SELECT id FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1', [username]);
  return rows.length > 0;
}

async function findApprovedMemberByReferralCode(db, code) {
  const [rows] = await db.execute(
    "SELECT id FROM members WHERE referral_code = ? AND status = 'approved' LIMIT 1",
    [code]
  );
  return rows.length > 0;
}

async function insertMember(db, f) {
  await db.execute(
    `INSERT INTO members (name, phone, email, username, location, company_name, job_role, password_hash, status, created_at, receive_blog_emails, referral_code, referred_by_code)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, ?, ?, ?)`,
    [f.name, f.phone || null, f.email, f.username, f.location || null, f.company_name || null, f.job_role || null,
     f.hash, parseInt(f.receive_blog_emails) || 1, f.newRefCode, f.referredByCode]
  );
}

// ── Profile ───────────────────────────────────────────────────────────────
async function findMemberProfileById(db, memberId) {
  const [rows] = await db.execute(
    'SELECT id, name, email, username, phone, location, company_name, job_role, profile_image, receive_blog_emails, profile_visibility, status FROM members WHERE id = ? LIMIT 1',
    [memberId]
  );
  return rows[0] || null;
}

async function findContributorApprovedByEmail(db, email) {
  const [rows] = await db.execute(
    "SELECT id FROM contributors WHERE LOWER(email) = LOWER(?) AND status = 'approved' LIMIT 1",
    [email]
  ).catch(() => [[]]);
  return rows.length > 0;
}

async function updateMemberProfile(db, memberId, fields) {
  const updates = ['name=?', 'phone=?', 'location=?', 'company_name=?', 'job_role=?', 'receive_blog_emails=?', 'updated_at=CURRENT_TIMESTAMP'];
  const params = [fields.name, fields.phone || null, fields.location || null, fields.company_name || null, fields.job_role || null,
    fields.receive_blog_emails != null ? (['true','1',1,true].includes(fields.receive_blog_emails) ? 1 : 0) : 1];

  if (fields.profile_visibility) {
    updates.push('profile_visibility=?');
    params.push(typeof fields.profile_visibility === 'string' ? fields.profile_visibility : JSON.stringify(fields.profile_visibility));
  }

  if (fields.profileImage) {
    updates.push('profile_image=?');
    params.push(fields.profileImage);
  }

  params.push(memberId);
  await db.execute(`UPDATE members SET ${updates.join(',')} WHERE id=?`, params);
}

async function findMemberEmailById(db, memberId) {
  const [rows] = await db.execute('SELECT email FROM members WHERE id=?', [memberId]);
  return rows[0] || null;
}

async function syncProfileImageToUserAndContributor(db, email, profileImage) {
  await db.execute('UPDATE users SET profile_image=? WHERE LOWER(email)=LOWER(?)', [profileImage, email]).catch(() => {});
  await db.execute(
    'UPDATE contributors SET image=? WHERE id=(SELECT contributor_id FROM users WHERE LOWER(email)=LOWER(?) LIMIT 1)',
    [profileImage, email]
  ).catch(() => {});
}

// ── Referral ──────────────────────────────────────────────────────────────
async function findReferralCodeById(db, memberId) {
  const [rows] = await db.execute('SELECT referral_code FROM members WHERE id = ? LIMIT 1', [memberId]);
  return rows[0] || null;
}

async function updateReferralCode(db, memberId, code) {
  await db.execute('UPDATE members SET referral_code = ? WHERE id = ?', [code, memberId]);
}

async function countApprovedReferrals(db, code) {
  const [rows] = await db.execute(
    "SELECT COUNT(*) as cnt FROM members WHERE referred_by_code = ? AND status = 'approved'",
    [code]
  );
  return rows[0]?.cnt || 0;
}

// ── Achievements ──────────────────────────────────────────────────────────
// Lazy-init achievements tables (idempotent).
// Two MySQL/MariaDB incompatibilities here, both confirmed against a real
// MySQL server:
//  - `id TEXT PRIMARY KEY` -> ERROR 1170, "BLOB/TEXT column 'id' used in key
//    specification without a key length". Achievement IDs are short slugs
//    ('welcome', 'first_comment', etc.), so VARCHAR is correct anyway.
//  - `id INTEGER PRIMARY KEY AUTOINCREMENT` is SQLite-only syntax; MySQL
//    needs AUTO_INCREMENT (with underscore) and no portable single spelling
//    covers both engines, so this one branches on isSQLite like blog_ads.js.
async function ensureAchievementTables(db) {
  await db.execute(`CREATE TABLE IF NOT EXISTS member_achievement_types (
    id VARCHAR(50) PRIMARY KEY,
    label VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(50) NOT NULL,
    color VARCHAR(20) NOT NULL,
    bg VARCHAR(20) NOT NULL,
    criteria TEXT NOT NULL
  )`);
  if (isSQLite) {
    await db.execute(`CREATE TABLE IF NOT EXISTS member_achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      achievement_id TEXT NOT NULL,
      earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      email_sent INTEGER NOT NULL DEFAULT 0,
      UNIQUE(member_id, achievement_id),
      FOREIGN KEY (member_id) REFERENCES members(id)
    )`);
  } else {
    await db.execute(`CREATE TABLE IF NOT EXISTS member_achievements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      member_id INT NOT NULL,
      achievement_id VARCHAR(50) NOT NULL,
      earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      email_sent INT NOT NULL DEFAULT 0,
      UNIQUE(member_id, achievement_id),
      FOREIGN KEY (member_id) REFERENCES members(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }
  // Add email_sent column if it doesn't exist yet (idempotent migration)
  try {
    await db.execute(`ALTER TABLE member_achievements ADD COLUMN email_sent INTEGER NOT NULL DEFAULT 0`);
  } catch (_) { /* column already exists */ }

  // Seed the achievement types (INSERT IGNORE = idempotent).
  // Note: INSERT IGNORE, not SQLite's "INSERT OR IGNORE" — db.js's
  // translateSQL() converts the MySQL spelling to the SQLite one
  // automatically for the SQLite adapter, but only if the code is written
  // in MySQL syntax to begin with. The raw mysql2 driver used in production
  // has no such translation layer, so "INSERT OR IGNORE" is a hard SQL
  // syntax error there (confirmed against a real MySQL server).
  const types = [
    ['welcome',               'Welcome Aboard',        'Joined the SAP Security Expert community',                    'bi-stars',            '#7c3aed', '#faf5ff', 'Join as a member'],
    ['first_comment',         'First Voice',           'Had your first comment approved by the team',                 'bi-chat-heart-fill',  '#0369a1', '#f0f9ff', '1 approved comment'],
    ['100_helpful_comments',  'Community Champion',    'Contributed 100 approved comments to the community',          'bi-trophy-fill',      '#b45309', '#fffbeb', '100 approved comments'],
    ['top_contributor',       'Expert Contributor',    'Recognized as an approved content contributor',               'bi-pen-fill',         '#15803d', '#f0fdf4', 'Become an approved contributor'],
    ['profile_complete',      'Profile Pro',           'Completed your full member profile',                          'bi-person-check-fill','#ee5e42', '#fff5f3', 'Complete all profile fields'],
    ['linkedin_ambassador',   'LinkedIn Ambassador',   'Shared SAP Security Expert content on LinkedIn',              'bi-linkedin',         '#0077b5', '#eff8ff', 'Share on LinkedIn once'],
    ['first_referral',        'Community Builder',     'Successfully referred a member to join the community',        'bi-people-fill',      '#dc2626', '#fef2f2', 'Refer 1 approved member'],
  ];
  // Upsert, not INSERT IGNORE: this table was previously seeded with an
  // older/corrupted set of labels and icon classes (mismatched wording, and
  // on environments where the column predates utf8mb4, any emoji once stored
  // here degraded to literal "?" characters). IGNORE would leave that bad
  // data in place forever since the row already exists — force an update to
  // the current, emoji-free values every time the server starts instead.
  for (const [id, label, description, icon, color, bg, criteria] of types) {
    await db.execute(
      `INSERT IGNORE INTO member_achievement_types (id, label, description, icon, color, bg, criteria) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, label, description, icon, color, bg, criteria]
    ).catch(() => {});
  }
}

async function findAchievementRecord(db, memberId, achievementId) {
  const [rows] = await db.execute(
    'SELECT id, email_sent FROM member_achievements WHERE member_id = ? AND achievement_id = ?',
    [memberId, achievementId]
  );
  return rows[0] || null;
}

async function insertAchievement(db, memberId, achievementId) {
  await db.execute(
    'INSERT IGNORE INTO member_achievements (member_id, achievement_id, email_sent) VALUES (?, ?, 0)',
    [memberId, achievementId]
  ).catch(() => {});
}

async function findAchievementType(db, achievementId) {
  const [rows] = await db.execute(
    'SELECT label, description, icon FROM member_achievement_types WHERE id = ?',
    [achievementId]
  );
  return rows[0] || null;
}

async function markAchievementEmailSent(db, memberId, achievementId) {
  await db.execute(
    'UPDATE member_achievements SET email_sent = 1 WHERE member_id = ? AND achievement_id = ?',
    [memberId, achievementId]
  ).catch(() => {});
}

async function findAllAchievementTypes(db) {
  const [rows] = await db.execute('SELECT * FROM member_achievement_types ORDER BY id');
  return rows;
}

async function findEarnedAchievements(db, memberId) {
  const [rows] = await db.execute(
    'SELECT achievement_id, earned_at FROM member_achievements WHERE member_id = ?',
    [memberId]
  );
  return rows;
}

async function findMemberEmailAndName(db, memberId) {
  const [rows] = await db.execute('SELECT email, name FROM members WHERE id = ?', [memberId]);
  return rows[0] || null;
}

async function countApprovedComments(db, memberId) {
  const [rows] = await db.execute(
    "SELECT COUNT(*) as cnt FROM comments WHERE member_id = ? AND status = 'approved'",
    [memberId]
  );
  return rows[0]?.cnt || 0;
}

async function hasCreditTransactionNote(db, memberId, note) {
  const [rows] = await db.execute(
    'SELECT id FROM credit_transactions WHERE member_id = ? AND note = ? LIMIT 1',
    [memberId, note]
  );
  return rows.length > 0;
}

// ── Change password ───────────────────────────────────────────────────────
async function findMemberAuthById(db, memberId) {
  const [rows] = await db.execute('SELECT id, email, password_hash FROM members WHERE id = ?', [memberId]);
  return rows[0] || null;
}

async function updateMemberPassword(db, memberId, hash) {
  await db.execute('UPDATE members SET password_hash=? WHERE id=?', [hash, memberId]);
}

async function syncPasswordToUser(db, email, hash) {
  await db.execute('UPDATE users SET password=? WHERE LOWER(email)=LOWER(?)', [hash, email])
    .catch(err => console.error('[change-password] users sync failed:', err.message));
}

module.exports = {
  findMemberByEmailOrUsername, findUserByEmailOrUsername, findContributorByEmail, findContributorById,
  findMemberByEmailExact, createMemberLazy, findMemberByEmailExactRaw, findPermissionsByUserId, findActiveSubscription,
  findMemberStatusByEmail, userExistsByEmail, memberExistsByUsername, userExistsByUsername,
  findApprovedMemberByReferralCode, insertMember,
  findMemberProfileById, findContributorApprovedByEmail, updateMemberProfile, findMemberEmailById, syncProfileImageToUserAndContributor,
  findReferralCodeById, updateReferralCode, countApprovedReferrals,
  ensureAchievementTables, findAchievementRecord, insertAchievement, findAchievementType, markAchievementEmailSent,
  findAllAchievementTypes, findEarnedAchievements, findMemberEmailAndName, countApprovedComments, hasCreditTransactionNote,
  findMemberAuthById, updateMemberPassword, syncPasswordToUser,
};
