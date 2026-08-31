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

// Same rule as contributors: an approved ambassador's image/profile only
// goes public once they've actually published something — the badge is a
// recognition, but the public directory shouldn't show a profile picture
// for someone who registered and never contributed content.
async function findApprovedAmbassadors(db) {
  const [rows] = await db.execute(
    `SELECT * FROM (
       SELECT a.id, a.full_name, a.country, a.state, a.city, a.organization, a.current_role, a.motivation, a.expertise,
              a.image AS profile_image, a.created_at, a.has_badge, a.badge_year,
         (SELECT COUNT(*) FROM blogs b JOIN users u ON b.author_id = u.id
          WHERE u.ambassador_id = a.id AND b.status IN ('approved','published')) AS contributions_count
       FROM ambassadors a WHERE a.status = 'approved'
     ) t WHERE contributions_count > 0
     ORDER BY has_badge DESC, created_at DESC`
  );
  return rows;
}

async function findApprovedProfileById(db, id) {
  const [rows] = await db.execute(
    `SELECT id, full_name, country, state, city, organization, \`current_role\`, years_experience,
            expertise, other_expertise, motivation, contribution_examples, linkedin, image AS profile_image,
            created_at, approved_at, has_badge, badge_year
     FROM ambassadors WHERE id = ? AND status = 'approved' LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function findPublishedBlogsByAuthorId(db, authorId) {
  const [rows] = await db.execute(
    `SELECT id, title, slug, category, excerpt, date, image, view_count, updated_at
     FROM blogs
     WHERE author_id = ? AND status IN ('approved','published')
     ORDER BY date DESC`,
    [authorId]
  );
  return rows;
}

async function findUserIdByAmbassadorId(db, ambassadorId) {
  const [rows] = await db.execute('SELECT id FROM users WHERE ambassador_id = ? LIMIT 1', [ambassadorId]);
  return rows[0]?.id || null;
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
  findBadgeYearsByAmbassadorId, findPublishedBlogsByAuthorId, findUserIdByAmbassadorId,
};
