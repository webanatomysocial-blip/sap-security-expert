const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { deleteImage } = require('../utils/helpers');
const NotificationService = require('../services/NotificationService');
const MailService = require('../services/MailService');
const repo = require('../repositories/ambassadorsPublicRepository');
const geoip = require('geoip-lite');
const { Country } = require('country-state-city');

const isoToCountryName = new Map(Country.getAllCountries().map((c) => [c.isoCode, c.name]));

// Client-reported detectedCountry (from browser geolocation) is trivially
// spoofable — it's just a request-body field. The IP→country lookup can't be
// edited by the client the same way, so it's the actual security check;
// detectedCountry is kept only as a UX nicety (catches honest VPN/travel
// mismatches with a clearer message than a raw IP lookup could).
function countryFromIp(ip) {
  const geo = geoip.lookup(ip);
  if (!geo?.country) return '';
  return isoToCountryName.get(geo.country) || '';
}

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

  // Country Ambassador applies for THEIR OWN country. The actual check is
  // IP-based (can't be spoofed by editing the request body, unlike the
  // client-reported detectedCountry below); the browser-geolocation value is
  // only used to give a clearer error message when it's available.
  const claimedCountry = (input.country || '').trim();
  const detectedCountry = (input.detectedCountry || '').trim();
  const ipCountry = countryFromIp(req.ip);
  const locationVerified = !!ipCountry && ipCountry.toLowerCase() === claimedCountry.toLowerCase();
  if (!locationVerified) {
    if (imagePath) deleteImage(imagePath);
    return res.status(400).json({
      status: 'error',
      message: ipCountry
        ? `Your detected location (${ipCountry}) doesn't match the country you're applying for (${claimedCountry}). Country Ambassador applications must be submitted from your own country.`
        : detectedCountry && detectedCountry.toLowerCase() !== claimedCountry.toLowerCase()
          ? `Your detected location (${detectedCountry}) doesn't match the country you're applying for (${claimedCountry}). Country Ambassador applications must be submitted from your own country.`
          : 'We could not verify your location. Please try again or contact support if this keeps happening.',
    });
  }

  const fields = {
    fullName: input.fullName || '', email, linkedin: input.linkedin || '',
    country: input.country || '', state: input.state || '', city: input.city || '',
    organization: input.organization || '', currentRole: input.currentRole || '',
    yearsExperience: input.yearsExperience || '', expertise, otherExpertiseText: input.otherExpertiseText || '',
    motivation: input.motivation || '', contributionExamples: input.contributionExamples || '',
    nominationType: input.nominationType || 'self', imagePath,
    detectedCountry, locationVerified,
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

  return sendSuccess(res, { ambassador });
});

module.exports = { apply, listApproved, getProfile };
