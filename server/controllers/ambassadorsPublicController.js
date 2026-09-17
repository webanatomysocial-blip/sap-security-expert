const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { deleteImage } = require('../utils/helpers');
const NotificationService = require('../services/NotificationService');
const MailService = require('../services/MailService');
const repo = require('../repositories/ambassadorsPublicRepository');

// POST /api/ambassadors/apply
const apply = async (req, res) => {
  const db = req.db;
  const input = req.body || {};

  const captchaAns = parseInt(input.captchaAns || '0');
  const captchaExpected = parseInt(req.session.captcha_ans || '0');
  if (!captchaAns || captchaAns !== captchaExpected) {
    return res.status(400).json({ status: 'error', message: 'Invalid Captcha. Please try again.' });
  }

  const email = input.email || '';
  let imagePath = null;
  if (req.file) {
    imagePath = '/uploads/ambassadors/' + req.file.filename;
  }

  let expertise = input.expertise || '{}';
  if (Array.isArray(expertise) || typeof expertise === 'object') expertise = JSON.stringify(expertise);

  let communityContribution = input.communityContribution || '{}';
  if (Array.isArray(communityContribution) || typeof communityContribution === 'object') {
    communityContribution = JSON.stringify(communityContribution);
  }

  let ambassadorMotivations = input.ambassadorMotivations || '{}';
  if (Array.isArray(ambassadorMotivations) || typeof ambassadorMotivations === 'object') {
    ambassadorMotivations = JSON.stringify(ambassadorMotivations);
  }

  const fields = {
    fullName: input.fullName || '', email, linkedin: input.linkedin || '',
    country: input.country || '', state: input.state || '', city: input.city || '',
    organization: input.organization || '',
    currentRole: input.currentRole === 'Other' && input.otherCurrentRoleText ? input.otherCurrentRoleText : (input.currentRole || ''),
    yearsExperience: input.yearsExperience || '', expertise, otherExpertiseText: input.otherExpertiseText || '',
    // motivation/contributionExamples now carry the questionnaire's two
    // public-facing long-answer questions (contribution plan / initiative
    // example) — reusing these columns since they already render on the
    // public profile page.
    motivation: input.contributionPlan || '', contributionExamples: input.initiativeExample || '',
    aboutMe: input.aboutMe || '',
    nominationType: 'self', imagePath,
    communityContribution, contributionLinks: input.contributionLinks || '',
    mentorshipExperience: input.mentorshipExperience || '', communityHelpingFrequency: input.communityHelpingFrequency || '',
    countryChallenge: input.countryChallenge || '', ambassadorMotivations, otherMotivationText: input.otherMotivationText || '',
    contributionWillingness: input.contributionWillingness || '', ambassadorDefinition: input.ambassadorDefinition || '',
  };

  try {
    const existing = await repo.findByEmail(db, email);

    if (existing) {
      if (existing.status === 'rejected') {
        if (imagePath && existing.image && existing.image !== imagePath) deleteImage(existing.image);
        await repo.updateRejectedApplication(db, existing.id, fields);
        const mailService = MailService.getInstance();
        const notifier = new NotificationService(mailService, db);
        notifier.notifyAmbassadorApplicationSubmitted(email, { name: input.fullName, country: input.country }).catch(() => {});
        return sendSuccess(res, { message: 'Application re-submitted successfully', id: existing.id });
      }
      return res.json({ status: 'error', message: `An application with this email already exists and is ${existing.status}.` });
    }

    const newId = await repo.createApplication(db, fields);

    const mailService = MailService.getInstance();
    const notifier = new NotificationService(mailService, db);
    notifier.notifyAmbassadorApplicationSubmitted(email, { name: input.fullName, country: input.country }).catch(() => {});

    return sendSuccess(res, { message: 'Application submitted successfully', id: newId });
  } catch (err) {
    console.error('[ambassador apply]', err.message);
    return res.status(500).json({ status: 'error', message: 'Something went wrong while processing your application.' });
  }
};

// GET /api/ambassadors/approved — bare array
const listApproved = asyncHandler(async (req, res) => {
  const rows = await repo.findApprovedAmbassadors(req.db);
  return res.json(rows);
});

// GET /api/ambassadors/profile/:id
const getProfile = asyncHandler(async (req, res) => {
  const db = req.db;
  const id = req.params.id || req.query.id;
  if (!id) return sendError(res, 'Ambassador ID is required.', 400);

  const row = await repo.findApprovedProfileById(db, id);
  if (!row) return sendError(res, 'Ambassador not found or not approved.', 404);

  const ambassador = { ...row };
  if (ambassador.expertise && typeof ambassador.expertise === 'string') {
    try { ambassador.expertise = JSON.parse(ambassador.expertise); } catch { ambassador.expertise = {}; }
  }
  if (ambassador.community_contribution && typeof ambassador.community_contribution === 'string') {
    try { ambassador.community_contribution = JSON.parse(ambassador.community_contribution); } catch { ambassador.community_contribution = {}; }
  }
  ambassador.badge_years = await repo.findBadgeYearsByAmbassadorId(db, ambassador.id);

  return sendSuccess(res, { ambassador });
});

// POST /api/ambassadors/about-me — self-service bio edit from Profile Settings
const updateAboutMe = asyncHandler(async (req, res) => {
  const db = req.db;
  if (!req.session.member_logged_in) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
  const aboutMe = String(req.body?.aboutMe || '').slice(0, 2000);
  await repo.updateAboutMe(db, req.session.member_email, aboutMe);
  return sendSuccess(res, { message: 'Bio updated.' });
});

module.exports = { apply, listApproved, getProfile, updateAboutMe };
