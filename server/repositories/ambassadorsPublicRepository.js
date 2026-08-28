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
  await db.execute(
    `UPDATE ambassadors SET
     full_name=?, linkedin=?, country=?, state=?, city=?, organization=?, current_role=?, years_experience=?,
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
     (full_name, email, linkedin, country, state, city, organization, current_role, years_experience,
      expertise, other_expertise, motivation, contribution_examples, nomination_type, detected_country, location_verified,
      image, status, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending',CURRENT_TIMESTAMP)`,
    [fullName, email, linkedin, country, state, city, organization, currentRole, yearsExperience,
     expertise, otherExpertiseText, motivation, contributionExamples, nominationType,
     detectedCountry || null, locationVerified ? 1 : 0, imagePath]
  );
  return result.insertId;
}

async function findApprovedAmbassadors(db) {
  const [rows] = await db.execute(
    `SELECT id, full_name, country, state, city, organization, current_role, motivation, expertise,
            image AS profile_image, created_at, has_badge, badge_year
     FROM ambassadors WHERE status = 'approved' ORDER BY has_badge DESC, created_at DESC`
  );
  return rows;
}

async function findApprovedProfileById(db, id) {
  const [rows] = await db.execute(
    `SELECT id, full_name, country, state, city, organization, current_role, years_experience,
            expertise, other_expertise, motivation, contribution_examples, linkedin, image AS profile_image,
            created_at, approved_at, has_badge, badge_year
     FROM ambassadors WHERE id = ? AND status = 'approved' LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

module.exports = {
  findByEmail, updateRejectedApplication, createApplication, findApprovedAmbassadors, findApprovedProfileById,
};
