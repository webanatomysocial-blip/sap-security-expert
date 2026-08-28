const { applyContributorCountryVisibility } = require('../utils/contributorVisibility');

async function findByEmail(db, email) {
  const [rows] = await db.execute('SELECT id, status, image FROM contributors WHERE email = ?', [email]);
  return rows[0] || null;
}

async function updateRejectedApplication(db, id, fields) {
  const {
    fullName, linkedin, country, organization, designation, role, expertise, otherExpertiseText,
    yearsExperience, shortBio, contributionTypes, proposedTopics, contributedElsewhere, previousWorkLinks,
    preferredFrequency, primaryMotivation, weeklyTime, volunteerEvents, productEvaluation,
    personalWebsite, twitterHandle, imagePath,
  } = fields;
  await db.execute(
    `UPDATE contributors SET
     full_name=?, linkedin=?, country=?, organization=?, designation=?,
     role=?, expertise=?, other_expertise=?, years_experience=?, short_bio=?,
     contribution_types=?, proposed_topics=?, contributed_elsewhere=?, previous_work_links=?,
     preferred_frequency=?, primary_motivation=?, weekly_time=?, volunteer_events=?,
     product_evaluation=?, personal_website=?, twitter_handle=?, image=COALESCE(?,image),
     status='pending', created_at=CURRENT_TIMESTAMP WHERE id=?`,
    [fullName, linkedin, country, organization, designation,
     role, expertise, otherExpertiseText, yearsExperience, shortBio,
     contributionTypes, proposedTopics, contributedElsewhere, previousWorkLinks,
     preferredFrequency, primaryMotivation, weeklyTime,
     volunteerEvents, productEvaluation,
     personalWebsite, twitterHandle, imagePath, id]
  );
}

async function createApplication(db, fields) {
  const {
    fullName, email, linkedin, country, organization, designation, role, expertise, otherExpertiseText,
    yearsExperience, shortBio, contributionTypes, proposedTopics, contributedElsewhere, previousWorkLinks,
    preferredFrequency, primaryMotivation, weeklyTime, volunteerEvents, productEvaluation,
    personalWebsite, twitterHandle, imagePath,
  } = fields;
  const [result] = await db.execute(
    `INSERT INTO contributors
     (full_name, email, linkedin, country, organization, designation, role, expertise, other_expertise,
      years_experience, short_bio, contribution_types, proposed_topics, contributed_elsewhere, previous_work_links,
      preferred_frequency, primary_motivation, weekly_time, volunteer_events, product_evaluation,
      personal_website, twitter_handle, image, status, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending',CURRENT_TIMESTAMP)`,
    [fullName, email, linkedin, country, organization, designation,
     role, expertise, otherExpertiseText, yearsExperience, shortBio,
     contributionTypes, proposedTopics, contributedElsewhere, previousWorkLinks,
     preferredFrequency, primaryMotivation, weeklyTime,
     volunteerEvents, productEvaluation,
     personalWebsite, twitterHandle, imagePath]
  );
  return result.insertId;
}

// Contributors get their own `members` row (created on approval) — that's
// where the show_country privacy toggle lives, so their public country
// (whether from the contributor application or their member profile) is
// gated by the same member-level setting rather than always shown.
// (applyContributorCountryVisibility now lives in utils/contributorVisibility.js,
// shared with publicRepository.js.)

// Only contributors with at least one published article are shown publicly.
async function findApprovedContributors(db) {
  const [rows] = await db.execute(
    `SELECT * FROM (
       SELECT id, full_name, role, organization, designation, short_bio, expertise, image AS profile_image, created_at,
         (SELECT COUNT(*) FROM blogs b JOIN users u ON b.author_id = u.id
          WHERE u.contributor_id = contributors.id AND b.status IN ('approved','published')) AS contributions_count,
         (SELECT m.country FROM members m WHERE LOWER(m.email) = LOWER(contributors.email) LIMIT 1) AS member_country,
         (SELECT m.profile_visibility FROM members m WHERE LOWER(m.email) = LOWER(contributors.email) LIMIT 1) AS profile_visibility
       FROM contributors WHERE status = 'approved'
     ) t WHERE contributions_count > 0
     ORDER BY created_at DESC`
  );
  return rows.map((r) => applyContributorCountryVisibility({ ...r, country: r.member_country || r.country }));
}

async function findApprovedProfileById(db, id) {
  const [rows] = await db.execute(
    `SELECT c.id, c.full_name, c.role, c.organization, c.designation, c.short_bio,
            c.expertise, c.image AS profile_image, c.linkedin, c.twitter_handle,
            c.personal_website, c.created_at, c.country,
            c.sap_certifications, c.sap_press_books, c.implementations_count,
            c.peer_rating, c.peer_rating_count, c.experience_years,
            u.id AS user_id, u.username,
            (SELECT m.country FROM members m WHERE LOWER(m.email) = LOWER(c.email) LIMIT 1) AS member_country,
            (SELECT m.profile_visibility FROM members m WHERE LOWER(m.email) = LOWER(c.email) LIMIT 1) AS profile_visibility
     FROM contributors c
     LEFT JOIN users u ON u.contributor_id = c.id
     WHERE c.id = ? AND c.status = 'approved' LIMIT 1`,
    [id]
  );
  if (!rows[0]) return null;
  return applyContributorCountryVisibility({ ...rows[0], country: rows[0].member_country || rows[0].country });
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

async function findFounderBlogs(db) {
  const [rows] = await db.execute(
    `SELECT id, title, slug, category, excerpt, date, image, view_count, updated_at
     FROM blogs
     WHERE (author_id IS NULL OR author_id = 1) AND status IN ('approved','published')
     ORDER BY date DESC`
  );
  return rows;
}

async function updateReputation(db, id, fields) {
  const { experience_years, implementations_count, peer_rating, peer_rating_count, sap_certifications, sap_press_books } = fields;
  await db.execute(
    `UPDATE contributors SET
      experience_years=?, implementations_count=?, peer_rating=?, peer_rating_count=?,
      sap_certifications=?, sap_press_books=?
     WHERE id=?`,
    [experience_years, implementations_count, peer_rating, peer_rating_count, sap_certifications, sap_press_books, id]
  );
}

module.exports = {
  findByEmail, updateRejectedApplication, createApplication, findApprovedContributors,
  findApprovedProfileById, findPublishedBlogsByAuthorId, findFounderBlogs, updateReputation,
};
