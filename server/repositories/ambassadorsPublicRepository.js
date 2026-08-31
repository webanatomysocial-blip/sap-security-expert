async function findByEmail(db, email) {
  const [rows] = await db.execute('SELECT id, status, image FROM ambassadors WHERE email = ?', [email]);
  return rows[0] || null;
}

async function updateRejectedApplication(db, id, fields) {
  const {
    fullName, linkedin, country, state, city, organization, currentRole, yearsExperience,
    expertise, otherExpertiseText, motivation, contributionExamples, nominationType, imagePath,
    detectedCountry, locationVerified,
  } = fields;
  // `current_role` is unquoted here because MariaDB parses it as the
  // CURRENT_ROLE keyword in this grammatical position (a bare identifier in
  // an UPDATE SET list) and throws a syntax error — confirmed live on the
  // dev server. Backtick-quoting forces it to be read as a column name.
  await db.execute(
    `UPDATE ambassadors SET
     full_name=?, linkedin=?, country=?, state=?, city=?, organization=?, \`current_role\`=?, years_experience=?,
     expertise=?, other_expertise=?, motivation=?, contribution_examples=?, nomination_type=?,
     detected_country=?, location_verified=?,
     image=COALESCE(?,image), status='pending', created_at=CURRENT_TIMESTAMP WHERE id=?`,
    [fullName, linkedin, country, state, city, organization, currentRole, yearsExperience,
     expertise, otherExpertiseText, motivation, contributionExamples, nominationType,
     detectedCountry || null, locationVerified ? 1 : 0, imagePath, id]
  );
}

async function createApplication(db, fields) {
  const {
    fullName, email, linkedin, country, state, city, organization, currentRole, yearsExperience,
    expertise, otherExpertiseText, motivation, contributionExamples, nominationType, imagePath,
    detectedCountry, locationVerified,
  } = fields;
  const [result] = await db.execute(
    `INSERT INTO ambassadors
     (full_name, email, linkedin, country, state, city, organization, \`current_role\`, years_experience,
      expertise, other_expertise, motivation, contribution_examples, nomination_type, detected_country, location_verified,
      image, status, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending',CURRENT_TIMESTAMP)`,
    [fullName, email, linkedin, country, state, city, organization, currentRole, yearsExperience,
     expertise, otherExpertiseText, motivation, contributionExamples, nominationType,
     detectedCountry || null, locationVerified ? 1 : 0, imagePath]
  );
  return result.insertId;
}

// Every approved ambassador shows up — same as contributors, their photo
// stays hidden until they've actually published something.
async function findApprovedAmbassadors(db) {
  const [rows] = await db.execute(
    `SELECT a.id, a.full_name, a.country, a.state, a.city, a.organization, a.\`current_role\`, a.motivation, a.expertise,
            a.image AS profile_image, a.created_at, a.has_badge, a.badge_year,
       (SELECT COUNT(*) FROM blogs b JOIN users u ON b.author_id = u.id
        WHERE u.ambassador_id = a.id AND b.status IN ('approved','published')) AS contributions_count
     FROM ambassadors a WHERE a.status = 'approved'
     ORDER BY has_badge DESC, created_at DESC`
  );
  return rows.map((r) => ({ ...r, profile_image: r.contributions_count > 0 ? r.profile_image : null }));
}

async function findApprovedProfileById(db, id) {
  const [rows] = await db.execute(
    `SELECT a.id, a.full_name, a.country, a.state, a.city, a.organization, a.\`current_role\`, a.years_experience,
            a.expertise, a.other_expertise, a.motivation, a.contribution_examples, a.linkedin, a.image AS profile_image,
            a.created_at, a.approved_at, a.has_badge, a.badge_year, u.id AS user_id,
       (SELECT COUNT(*) FROM blogs b WHERE b.author_id = u.id AND b.status IN ('approved','published')) AS contributions_count
     FROM ambassadors a
     LEFT JOIN users u ON u.ambassador_id = a.id
     WHERE a.id = ? AND a.status = 'approved' LIMIT 1`,
    [id]
  );
  if (!rows[0]) return null;
  return { ...rows[0], profile_image: rows[0].contributions_count > 0 ? rows[0].profile_image : null };
}

// All years this ambassador has held their country's badge — the same
// person can win it several years running, each logged as its own row in
// ambassador_badge_history, so "current badge" (has_badge/badge_year above)
// only ever shows the latest one.
async function findBadgeYearsByAmbassadorId(db, ambassadorId) {
  const [rows] = await db.execute(
    'SELECT badge_year FROM ambassador_badge_history WHERE ambassador_id = ? ORDER BY badge_year DESC',
    [ambassadorId]
  );
  return rows.map((r) => r.badge_year);
}

module.exports = {
  findByEmail, updateRejectedApplication, createApplication, findApprovedAmbassadors, findApprovedProfileById,
  findBadgeYearsByAmbassadorId,
};
