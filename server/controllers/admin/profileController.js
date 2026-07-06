const bcrypt = require('bcryptjs');
const { asyncHandler } = require('../../utils/asyncHandler');
const { sendSuccess, sendError } = require('../../utils/apiResponse');
const repo = require('../../repositories/admin/profileRepository');

// GET /api/admin/profile
// Returns the logged-in user's profile. For contributors, falls back to
// contributors.image if users.profile_image is not set, so the uploaded
// application photo is always shown.
const getProfile = asyncHandler(async (req, res) => {
  const profile = await repo.findProfile(req.db, req.session.admin_id);
  if (!profile) return sendError(res, 'Profile not found', 404);
  return sendSuccess(res, { user: profile, csrf_token: req.session.csrf_token || null });
});

// POST /api/admin/profile/update
// Updates profile fields + optional image. Syncs image to contributors.image
// and members.profile_image so all three portals stay in sync.
const updateProfile = asyncHandler(async (req, res) => {
  const db = req.db;
  const { full_name, email, bio, designation, linkedin } = req.body || {};

  const profileImage = req.file ? '/uploads/profiles/' + req.file.filename : null;
  await repo.updateProfile(db, req.session.admin_id, { full_name, email, bio, designation, linkedin, profile_image: profileImage });

  if (profileImage) {
    await repo.syncProfileImageToContributor(db, req.session.admin_id, profileImage).catch(() => {});
    await repo.syncProfileImageToMember(db, req.session.admin_id, profileImage).catch(() => {});
  }

  const updated = await repo.findProfileBasic(db, req.session.admin_id);
  return sendSuccess(res, { message: 'Profile updated', user: updated });
});

// POST /api/admin/reset-password
// Changes own password. Syncs new hash to members table so contributor/member
// login stays in sync.
const resetPassword = asyncHandler(async (req, res) => {
  const db = req.db;
  const { current_password, new_password } = req.body || {};
  if (!current_password || !new_password) {
    return sendError(res, 'Both current and new passwords are required.', 400);
  }

  const user = await repo.findAuthByUserId(db, req.session.admin_id);
  if (!user) return sendError(res, 'User not found', 404);

  const match = await bcrypt.compare(current_password, user.password);
  if (!match) return sendError(res, 'Current password is incorrect.', 400);

  const hash = await bcrypt.hash(new_password, 10);
  await repo.updatePassword(db, req.session.admin_id, hash);
  await repo.syncPasswordToMember(db, user.email, hash).catch(() => {});

  return sendSuccess(res, { message: 'Password changed successfully.' });
});

module.exports = { getProfile, updateProfile, resetPassword };
