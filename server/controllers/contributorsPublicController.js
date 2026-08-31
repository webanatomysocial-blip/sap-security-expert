const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { deleteImage } = require('../utils/helpers');
const NotificationService = require('../services/NotificationService');
const MailService = require('../services/MailService');
const repo = require('../repositories/contributorsPublicRepository');

// POST /api/contributors/apply
// Kept as an explicit try/catch (not asyncHandler/next(err)): the outer
// catch returns a specific, already-safe custom message ("Something went
// wrong while processing your application.") — centralizing would silently
// replace that text with the generic "Internal server error".
const apply = async (req, res) => {
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
    const existing = await repo.findByEmail(db, email);

    if (existing) {
      if (existing.status === 'rejected') {
        if (imagePath && existing.image && existing.image !== imagePath) deleteImage(existing.image);
        await repo.updateRejectedApplication(db, existing.id, {
          fullName: input.fullName || '', linkedin: input.linkedin || '', country: input.country || '',
          organization: input.organization || '', designation: input.designation || '', role: input.role || '',
          expertise, otherExpertiseText: input.otherExpertiseText || '', yearsExperience: input.yearsExperience || '',
          shortBio: input.shortBio || '', contributionTypes, proposedTopics: input.proposedTopics || '',
          contributedElsewhere: input.contributedElsewhere || 'No', previousWorkLinks: input.previousWorkLinks || '',
          preferredFrequency: input.preferredFrequency || 'One-time', primaryMotivation: input.primaryMotivation || '',
          weeklyTime: input.weeklyTime || '', volunteerEvents: input.volunteerEvents || 'No',
          productEvaluation: input.productEvaluation || 'No', personalWebsite: input.personalWebsite || '',
          twitterHandle: input.twitterHandle || '', imagePath,
        });
        const mailService = MailService.getInstance();
        const notifier = new NotificationService(mailService, db);
        notifier.notifyContributorApplicationSubmitted(email, { name: input.fullName, experience: input.yearsExperience, details: input.proposedTopics }).catch(() => {});
        return sendSuccess(res, { message: 'Application re-submitted successfully', id: existing.id });
      }
      // Note: intentionally no explicit status code here — matches the
      // original response exactly (HTTP 200 with status:'error' in the body).
      return res.json({ status: 'error', message: `An application with this email already exists and is ${existing.status}.` });
    }

    const newId = await repo.createApplication(db, {
      fullName: input.fullName || '', email, linkedin: input.linkedin || '', country: input.country || '',
      organization: input.organization || '', designation: input.designation || '', role: input.role || '',
      expertise, otherExpertiseText: input.otherExpertiseText || '', yearsExperience: input.yearsExperience || '',
      shortBio: input.shortBio || '', contributionTypes, proposedTopics: input.proposedTopics || '',
      contributedElsewhere: input.contributedElsewhere || 'No', previousWorkLinks: input.previousWorkLinks || '',
      preferredFrequency: input.preferredFrequency || 'One-time', primaryMotivation: input.primaryMotivation || '',
      weeklyTime: input.weeklyTime || '', volunteerEvents: input.volunteerEvents || 'No',
      productEvaluation: input.productEvaluation || 'No', personalWebsite: input.personalWebsite || '',
      twitterHandle: input.twitterHandle || '', imagePath,
    });

    const mailService = MailService.getInstance();
    const notifier = new NotificationService(mailService, db);
    notifier.notifyContributorApplicationSubmitted(email, { name: input.fullName, experience: input.yearsExperience, details: input.proposedTopics }).catch(() => {});

    return sendSuccess(res, { message: 'Application submitted successfully', id: newId });
  } catch (err) {
    console.error('[contributor apply]', err.message);
    return res.status(500).json({ status: 'error', message: 'Something went wrong while processing your application.' });
  }
};

// GET /api/contributors/approved — bare array
const listApproved = asyncHandler(async (req, res) => {
  const rows = await repo.findApprovedContributors(req.db);
  return res.json(rows);
});

// GET /api/contributors/profile/:id
const getProfile = asyncHandler(async (req, res) => {
  const db = req.db;
  const id = req.params.id || req.query.id;

  if (!id) return sendError(res, 'Contributor ID is required.', 400);

  if (id === 'raghu' || id === 'raghu-boddu') {
    return getFounderProfile(req, res);
  }

  const row = await repo.findApprovedProfileById(db, id);
  if (!row) {
    return sendError(res, 'Contributor not found or not approved.', 404);
  }

  const contributor = { ...row };

  // Parse expertise JSON string → object
  if (contributor.expertise && typeof contributor.expertise === 'string') {
    try { contributor.expertise = JSON.parse(contributor.expertise); } catch { contributor.expertise = {}; }
  }
  // Parse reputation JSON arrays
  ['sap_certifications', 'sap_press_books'].forEach((field) => {
    if (contributor[field] && typeof contributor[field] === 'string') {
      try { contributor[field] = JSON.parse(contributor[field]); } catch { contributor[field] = []; }
    }
  });

  // Fetch published blog posts for this contributor — the profile itself is
  // always public once approved; findApprovedContributors/ProfileById
  // already null out profile_image until this list is non-empty.
  const userId = contributor.user_id || 0;
  const blogs = await repo.findPublishedBlogsByAuthorId(db, userId);

  contributor.blogs = blogs;
  contributor.blog_count = blogs.length;

  return sendSuccess(res, { contributor });
});

// GET /api/contributors/profile/raghu — special founder profile
const getFounderProfile = asyncHandler(async (req, res) => {
  const blogs = await repo.findFounderBlogs(req.db);
  return sendSuccess(res, {
    contributor: {
      id: 'raghu',
      full_name: 'Raghu Boddu',
      role: 'Founder & Principal SAP Security Architect',
      organization: 'SAP Security Expert',
      designation: 'Founder',
      short_bio: 'Raghu Boddu is a seasoned SAP Security Architect with deep expertise in SAP GRC, Access Control, BTP Security, and enterprise security governance. He founded SAP Security Expert to build the definitive community platform for SAP security professionals worldwide.',
      profile_image: '/assets/raghu_boddu.png',
      linkedin: 'https://www.linkedin.com/in/raghuboddu/',
      twitter_handle: null,
      personal_website: null,
      country: 'India',
      created_at: '2023-01-01',
      expertise: { sapSecurity: true, sapGrc: true, sapIag: true, sapBtp: true, sapCyber: true },
      experience_years: 15,
      implementations_count: 50,
      peer_rating: 4.9,
      peer_rating_count: 120,
      sap_certifications: [
        'SAP Certified Technology Associate – SAP S/4HANA Security',
        'SAP GRC Access Control Certified',
        'SAP BTP Security Certified',
      ],
      sap_press_books: [],
      blogs,
      blog_count: blogs.length,
      is_founder: true,
    },
  });
});

// PUT /api/contributors/:id/reputation — admin only
const updateReputation = asyncHandler(async (req, res) => {
  const db = req.db;
  const { id } = req.params;
  const {
    experience_years, implementations_count, peer_rating, peer_rating_count,
    sap_certifications, sap_press_books,
  } = req.body || {};

  // Coerce numbers — use null for missing/empty, but keep explicit 0
  const toIntOrNull = (v) => (v !== undefined && v !== null && v !== '') ? Number(v) : null;
  const toFloatOrNull = (v) => (v !== undefined && v !== null && v !== '') ? parseFloat(v) : null;

  const rating = toFloatOrNull(peer_rating);
  if (rating !== null && (!isFinite(rating) || rating < 0 || rating > 5)) {
    return sendError(res, 'peer_rating must be between 0 and 5.', 400);
  }

  await repo.updateReputation(db, id, {
    experience_years: toIntOrNull(experience_years),
    implementations_count: toIntOrNull(implementations_count),
    peer_rating: rating,
    peer_rating_count: toIntOrNull(peer_rating_count) ?? 0,
    sap_certifications: Array.isArray(sap_certifications) ? JSON.stringify(sap_certifications) : (sap_certifications || null),
    sap_press_books: Array.isArray(sap_press_books) ? JSON.stringify(sap_press_books) : (sap_press_books || null),
  });

  return sendSuccess(res, { message: 'Reputation updated.' });
});

module.exports = { apply, listApproved, getProfile, getFounderProfile, updateReputation };
