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

async function findApprovedContributors(db) {
  const [rows] = await db.execute(
    `SELECT id, full_name, role, organization, designation, short_bio, expertise, image AS profile_image, created_at,
       (SELECT COUNT(*) FROM blogs b JOIN users u ON b.author_id = u.id
        WHERE u.contributor_id = contributors.id AND b.status IN ('approved','published')) AS contributions_count
     FROM contributors WHERE status = 'approved' ORDER BY created_at DESC`
  );
  return rows;
}

async function findApprovedProfileById(db, id) {
  const [rows] = await db.execute(
    `SELECT c.id, c.full_name, c.role, c.organization, c.designation, c.short_bio,
            c.expertise, c.image AS profile_image, c.linkedin, c.twitter_handle,
            c.personal_website, c.created_at, c.country,
            c.sap_certifications, c.sap_press_books, c.implementations_count,
            c.peer_rating, c.peer_rating_count, c.experience_years,
            u.id AS user_id, u.username
     FROM contributors c
     LEFT JOIN users u ON u.contributor_id = c.id
     WHERE c.id = ? AND c.status = 'approved' LIMIT 1`,
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
