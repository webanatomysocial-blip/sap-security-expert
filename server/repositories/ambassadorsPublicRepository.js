const { slugify } = require('../utils/slugify');

// Appends -2, -3, ... until the slug doesn't collide with an existing one —
// full names aren't unique, but public profile URLs need to be.
async function generateUniqueSlug(db, fullName) {
  const base = slugify(fullName) || 'ambassador';
  let candidate = base;
  let n = 2;
  for (;;) {
    const [rows] = await db.execute('SELECT id FROM ambassadors WHERE slug = ? LIMIT 1', [candidate]);
    if (!rows.length) return candidate;
    candidate = `${base}-${n++}`;
  }
}

async function findByEmail(db, email) {
  const [rows] = await db.execute('SELECT id, status, image FROM ambassadors WHERE email = ?', [email]);
  return rows[0] || null;
}

async function updateRejectedApplication(db, id, fields) {
  const {
    fullName, linkedin, country, state, city, organization, currentRole, yearsExperience,
    expertise, otherExpertiseText, motivation, contributionExamples, nominationType, imagePath,
    detectedCountry, locationVerified,
    communityContribution, contributionLinks, mentorshipExperience, communityHelpingFrequency,
    countryChallenge, ambassadorMotivations, otherMotivationText, contributionWillingness, ambassadorDefinition,
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
     community_contribution=?, contribution_links=?, mentorship_experience=?, community_helping_frequency=?,
     country_challenge=?, ambassador_motivations=?, other_motivation_text=?, contribution_willingness=?, ambassador_definition=?,
     image=COALESCE(?,image), status='pending', created_at=CURRENT_TIMESTAMP WHERE id=?`,
    [fullName, linkedin, country, state, city, organization, currentRole, yearsExperience,
     expertise, otherExpertiseText, motivation, contributionExamples, nominationType,
     detectedCountry || null, locationVerified ? 1 : 0,
     communityContribution, contributionLinks, mentorshipExperience, communityHelpingFrequency,
     countryChallenge, ambassadorMotivations, otherMotivationText, contributionWillingness, ambassadorDefinition,
     imagePath, id]
  );
}

async function createApplication(db, fields) {
  const {
    fullName, email, linkedin, country, state, city, organization, currentRole, yearsExperience,
    expertise, otherExpertiseText, motivation, contributionExamples, nominationType, imagePath,
    detectedCountry, locationVerified,
    communityContribution, contributionLinks, mentorshipExperience, communityHelpingFrequency,
    countryChallenge, ambassadorMotivations, otherMotivationText, contributionWillingness, ambassadorDefinition,
  } = fields;
  const slug = await generateUniqueSlug(db, fullName);
  const [result] = await db.execute(
    `INSERT INTO ambassadors
     (full_name, email, linkedin, country, state, city, organization, \`current_role\`, years_experience,
      expertise, other_expertise, motivation, contribution_examples, nomination_type, detected_country, location_verified,
      community_contribution, contribution_links, mentorship_experience, community_helping_frequency,
      country_challenge, ambassador_motivations, other_motivation_text, contribution_willingness, ambassador_definition,
      image, slug, status, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending',CURRENT_TIMESTAMP)`,
    [fullName, email, linkedin, country, state, city, organization, currentRole, yearsExperience,
     expertise, otherExpertiseText, motivation, contributionExamples, nominationType,
     detectedCountry || null, locationVerified ? 1 : 0,
     communityContribution, contributionLinks, mentorshipExperience, communityHelpingFrequency,
     countryChallenge, ambassadorMotivations, otherMotivationText, contributionWillingness, ambassadorDefinition,
     imagePath, slug]
  );
  return result.insertId;
}

// Every approved ambassador shows up with their profile photo directly.
async function findApprovedAmbassadors(db) {
  const currentYear = new Date().getFullYear();
  const [rows] = await db.execute(
    `SELECT a.id, a.slug, a.full_name, a.country, a.state, a.city, a.organization, a.\`current_role\`, a.motivation, a.expertise,
            a.image AS profile_image, a.created_at,
            CASE WHEN (SELECT COUNT(*) FROM ambassador_badge_history h WHERE h.ambassador_id = a.id AND h.badge_year <= ?) > 0 THEN 1 ELSE 0 END AS has_badge,
            (SELECT MAX(h.badge_year) FROM ambassador_badge_history h WHERE h.ambassador_id = a.id AND h.badge_year <= ?) AS badge_year
     FROM ambassadors a WHERE a.status = 'approved'
     ORDER BY has_badge DESC, created_at DESC`,
    [currentYear, currentYear]
  );
  return rows;
}

// idOrSlug: the public profile URL now carries the ambassador's slug (e.g.
// "raghu-boddu"), but a bare numeric id is still accepted for any old
// bookmarked/shared links.
async function findApprovedProfileById(db, idOrSlug) {
  const currentYear = new Date().getFullYear();
  const [rows] = await db.execute(
    `SELECT a.id, a.slug, a.full_name, a.country, a.state, a.city, a.organization, a.\`current_role\`, a.years_experience,
            a.expertise, a.other_expertise, a.motivation, a.contribution_examples, a.linkedin, a.image AS profile_image,
            a.created_at, a.approved_at,
            CASE WHEN (SELECT COUNT(*) FROM ambassador_badge_history h WHERE h.ambassador_id = a.id AND h.badge_year <= ?) > 0 THEN 1 ELSE 0 END AS has_badge,
            (SELECT MAX(h.badge_year) FROM ambassador_badge_history h WHERE h.ambassador_id = a.id AND h.badge_year <= ?) AS badge_year,
            u.id AS user_id
     FROM ambassadors a
     LEFT JOIN users u ON u.ambassador_id = a.id
     WHERE (a.slug = ? OR a.id = ?) AND a.status = 'approved' LIMIT 1`,
    [currentYear, currentYear, idOrSlug, idOrSlug]
  );
  if (!rows[0]) return null;
  return rows[0];
}

// All years this ambassador has held their country's badge up to the current
// calendar year.
async function findBadgeYearsByAmbassadorId(db, ambassadorId) {
  const currentYear = new Date().getFullYear();
  const [rows] = await db.execute(
    'SELECT badge_year FROM ambassador_badge_history WHERE ambassador_id = ? AND badge_year <= ? ORDER BY badge_year DESC',
    [ambassadorId, currentYear]
  );
  return rows.map((r) => r.badge_year);
}

module.exports = {
  findByEmail, updateRejectedApplication, createApplication, findApprovedAmbassadors, findApprovedProfileById,
  findBadgeYearsByAmbassadorId,
};
