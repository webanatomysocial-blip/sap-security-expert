const router = require('express').Router();
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');
const { getUploadDir, deleteImage } = require('../utils/helpers');
const NotificationService = require('../services/NotificationService');
const MailService = require('../services/MailService');
const { rateLimit } = require('../middleware/rateLimit');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, getUploadDir('contributors')),
  filename: (req, file, cb) => {
    const ext = file.mimetype.split('/')[1].replace('jpeg', 'jpg');
    cb(null, `contributor_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    cb(null, allowed.includes(file.mimetype));
  },
});

// POST /api/contributors/apply
router.post('/apply', rateLimit('contributor_apply', 5, 3600), upload.single('profilePhoto'), async (req, res) => {
  const db = req.db;
  const input = req.body || {};

  // Captcha check
  const captchaAns = parseInt(input.captchaAns || '0');
  const captchaExpected = parseInt(req.session.captcha_ans || '0');
  if (!captchaAns || captchaAns !== captchaExpected) {
    return res.status(400).json({ status: 'error', message: 'Invalid Captcha. Please try again.' });
  }

  const email = input.email || '';
  let imagePath = null;

  if (req.file) {
    imagePath = '/uploads/contributors/' + req.file.filename;
  }

  let expertise = input.expertise || '{}';
  if (Array.isArray(expertise) || typeof expertise === 'object') expertise = JSON.stringify(expertise);

  let contributionTypes = input.contributionTypes || '{}';
  if (Array.isArray(contributionTypes) || typeof contributionTypes === 'object') contributionTypes = JSON.stringify(contributionTypes);

  try {
    const [existing] = await db.execute('SELECT id, status, image FROM contributors WHERE email = ?', [email]);

    if (existing.length) {
      const ex = existing[0];
      if (ex.status === 'rejected') {
        if (imagePath && ex.image && ex.image !== imagePath) deleteImage(ex.image);
        await db.execute(
          `UPDATE contributors SET
           full_name=?, linkedin=?, country=?, organization=?, designation=?,
           role=?, expertise=?, other_expertise=?, years_experience=?, short_bio=?,
           contribution_types=?, proposed_topics=?, contributed_elsewhere=?, previous_work_links=?,
           preferred_frequency=?, primary_motivation=?, weekly_time=?, volunteer_events=?,
           product_evaluation=?, personal_website=?, twitter_handle=?, image=COALESCE(?,image),
           status='pending', created_at=CURRENT_TIMESTAMP WHERE id=?`,
          [input.fullName||'', input.linkedin||'', input.country||'', input.organization||'', input.designation||'',
           input.role||'', expertise, input.otherExpertiseText||'', input.yearsExperience||'', input.shortBio||'',
           contributionTypes, input.proposedTopics||'', input.contributedElsewhere||'No', input.previousWorkLinks||'',
           input.preferredFrequency||'One-time', input.primaryMotivation||'', input.weeklyTime||'',
           input.volunteerEvents||'No', input.productEvaluation||'No',
           input.personalWebsite||'', input.twitterHandle||'', imagePath, ex.id]
        );
        const mailService = MailService.getInstance(db);
        const notifier = new NotificationService(mailService);
        notifier.notifyContributorApplicationSubmitted(email, { name: input.fullName, experience: input.yearsExperience, details: input.proposedTopics }).catch(() => {});
        return res.json({ status: 'success', message: 'Application re-submitted successfully', id: ex.id });
      }
      return res.json({ status: 'error', message: `An application with this email already exists and is ${ex.status}.` });
    }

    const [result] = await db.execute(
      `INSERT INTO contributors
       (full_name, email, linkedin, country, organization, designation, role, expertise, other_expertise,
        years_experience, short_bio, contribution_types, proposed_topics, contributed_elsewhere, previous_work_links,
        preferred_frequency, primary_motivation, weekly_time, volunteer_events, product_evaluation,
        personal_website, twitter_handle, image, status, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending',CURRENT_TIMESTAMP)`,
      [input.fullName||'', email, input.linkedin||'', input.country||'', input.organization||'', input.designation||'',
       input.role||'', expertise, input.otherExpertiseText||'', input.yearsExperience||'', input.shortBio||'',
       contributionTypes, input.proposedTopics||'', input.contributedElsewhere||'No', input.previousWorkLinks||'',
       input.preferredFrequency||'One-time', input.primaryMotivation||'', input.weeklyTime||'',
       input.volunteerEvents||'No', input.productEvaluation||'No',
       input.personalWebsite||'', input.twitterHandle||'', imagePath]
    );

    const mailService = MailService.getInstance(db);
    const notifier = new NotificationService(mailService);
    notifier.notifyContributorApplicationSubmitted(email, { name: input.fullName, experience: input.yearsExperience, details: input.proposedTopics }).catch(() => {});

    return res.json({ status: 'success', message: 'Application submitted successfully', id: result.insertId });
  } catch (err) {
    console.error('[contributor apply]', err.message);
    return res.status(500).json({ status: 'error', message: 'Something went wrong while processing your application.' });
  }
});

// GET /api/contributors/approved
router.get('/approved', async (req, res) => {
  const db = req.db;
  try {
    const [rows] = await db.execute(
      `SELECT id, full_name, role, image AS profile_image, created_at,
         (SELECT COUNT(*) FROM blogs b JOIN users u ON b.author_id = u.id
          WHERE u.contributor_id = contributors.id AND b.status IN ('approved','published')) AS contributions_count
       FROM contributors WHERE status = 'approved' ORDER BY created_at DESC`
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// GET /api/contributors/profile/:id  and  GET /api/get_contributor_profile.php?id=X
async function handleContributorProfile(req, res) {
  const db = req.db;
  const id = req.params.id || req.query.id;

  if (!id) return res.status(400).json({ status: 'error', message: 'Contributor ID is required.' });

  try {
    const [rows] = await db.execute(
      `SELECT c.id, c.full_name, c.role, c.organization, c.designation, c.short_bio,
              c.expertise, c.image AS profile_image, c.linkedin, c.twitter_handle,
              c.personal_website, c.created_at, c.country,
              u.id AS user_id, u.username
       FROM contributors c
       LEFT JOIN users u ON u.contributor_id = c.id
       WHERE c.id = ? AND c.status = 'approved' LIMIT 1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ status: 'error', message: 'Contributor not found or not approved.' });
    }

    const contributor = { ...rows[0] };

    // Parse expertise JSON string → object (mirrors PHP's json_decode)
    if (contributor.expertise && typeof contributor.expertise === 'string') {
      try { contributor.expertise = JSON.parse(contributor.expertise); } catch { contributor.expertise = {}; }
    }

    // Fetch published blog posts for this contributor
    const userId = contributor.user_id || 0;
    const [blogs] = await db.execute(
      `SELECT id, title, slug, category, excerpt, date, image, view_count
       FROM blogs
       WHERE author_id = ? AND status IN ('approved','published')
       ORDER BY date DESC`,
      [userId]
    );
    contributor.blogs = blogs;
    contributor.blog_count = blogs.length;

    return res.json({ status: 'success', contributor });
  } catch (err) {
    console.error('[contributor profile]', err.message);
    return res.status(500).json({ status: 'error', message: err.message });
  }
}

router.get('/profile/:id', handleContributorProfile);
router.get('/get_contributor_profile.php', handleContributorProfile);

module.exports = router;
