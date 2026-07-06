const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { asyncHandler } = require('../../utils/asyncHandler');
const { sendSuccess, sendError } = require('../../utils/apiResponse');
const { deleteImage } = require('../../utils/helpers');
const NotificationService = require('../../services/NotificationService');
const MailService = require('../../services/MailService');
const repo = require('../../repositories/admin/contributorsRepository');

// GET /api/admin/contributors — bare array, not the {status, ...} envelope
const list = asyncHandler(async (req, res) => {
  const rows = await repo.findAllActive(req.db);
  return res.json(rows);
});

// POST /api/admin/contributors — approve / reject / delete
const performAction = asyncHandler(async (req, res) => {
  const db = req.db;
  const body = req.body || {};
  const id = body.id;
  const reason = body.reason || body.rejection_reason || '';
  const raw = (body.action || body.status || '').toLowerCase();
  const ACTION = { approved: 'approve', approve: 'approve', rejected: 'reject', reject: 'reject', deleted: 'delete', delete: 'delete' };
  const normalised = ACTION[raw];

  if (!id || !normalised) return sendError(res, 'id and action are required', 400);

  const contributor = await repo.findById(db, id);
  if (!contributor) return sendError(res, 'Contributor not found', 404);

  const mailService = MailService.getInstance(db);
  const notifier = new NotificationService(mailService);

  if (normalised === 'approve') {
    await repo.updateStatus(db, id, 'approved');

    const existingUser = await repo.findUserByEmail(db, contributor.email);
    let password = null;

    if (!existingUser) {
      password = crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
      const hash = await bcrypt.hash(password, 10);
      const username = contributor.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + Date.now().toString().slice(-4);
      await repo.createUser(db, { username, email: contributor.email, hash, fullName: contributor.full_name, contributorId: id });
    } else {
      await repo.activateUserForContributor(db, id, contributor.email);
    }

    // Ensure contributor has a member record so they can log into the member portal
    const memberName = contributor.full_name || contributor.email.split('@')[0];
    const existingMember = await repo.findMemberByEmail(db, contributor.email);
    if (!existingMember) {
      // No member record yet — fetch the hash from users and create one
      const userPasswordRow = await repo.findUserPasswordByEmail(db, contributor.email);
      const memberHash = password ? await bcrypt.hash(password, 10) : userPasswordRow?.password;
      if (memberHash) {
        await repo.createMember(db, { name: memberName, email: contributor.email, passwordHash: memberHash });
      }
    } else if (password) {
      // Member exists — keep password in sync
      const approveHash = await bcrypt.hash(password, 10);
      await repo.updateMemberPasswordByEmail(db, contributor.email, approveHash);
    }

    notifier.notifyContributorApproved(contributor.email, contributor.full_name, { password }).catch(() => {});
    return sendSuccess(res, { message: 'Contributor approved.' });
  } else if (normalised === 'reject') {
    await repo.updateStatus(db, id, 'rejected');
    notifier.notifyContributorRejected(contributor.email, contributor.full_name, reason || 'Application not approved.').catch(() => {});
    return sendSuccess(res, { message: 'Contributor rejected.' });
  } else if (normalised === 'delete') {
    if (contributor.image) deleteImage(contributor.image);
    // Detach user account from contributor profile — user keeps their account as a regular member
    await repo.detachUserFromContributor(db, id);
    await repo.deleteContributor(db, id);
    return sendSuccess(res, { message: 'Contributor deleted. User account preserved as member.' });
  } else {
    return sendError(res, 'Unknown action', 400);
  }
});

// GET /api/admin/contributor-login?contributor_id=X
// Returns { has_login, user_id, is_active, permissions } — shape expected by ManageContributorModal
const getContributorLogin = asyncHandler(async (req, res) => {
  const db = req.db;
  const { contributor_id } = req.query;
  if (!contributor_id) return sendError(res, 'contributor_id required', 400);

  const user = await repo.findUserByContributorId(db, contributor_id);
  if (!user) return res.json({ has_login: false });

  const p = await repo.findPermissionsByUserId(db, user.id);
  const permissions = p ? {
    can_manage_blogs: !!p.can_manage_blogs,
    can_manage_ads: !!p.can_manage_ads,
    can_manage_comments: !!p.can_manage_comments,
    can_manage_announcements: !!p.can_manage_announcements,
    can_review_blogs: !!(p.can_review_blogs || 0),
    can_access_premium_articles: !!(p.can_access_premium_articles || 0),
  } : {};

  return res.json({ has_login: true, user_id: user.id, is_active: !!user.is_active, permissions });
});

// POST /api/admin/create-contributor-login
// Creates a user account. Generates password server-side, sends it via email,
// and returns it so the modal can display it — ensuring email and modal match.
const createContributorLogin = asyncHandler(async (req, res) => {
  const db = req.db;
  const { contributor_id, permissions } = req.body || {};
  if (!contributor_id) return sendError(res, 'contributor_id required', 400);

  const contributor = await repo.findById(db, contributor_id);
  if (!contributor) return sendError(res, 'Contributor not found', 404);

  // Generate a secure random password server-side
  const password = crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
  const hash = await bcrypt.hash(password, 10);
  const username = contributor.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + Date.now().toString().slice(-4);

  const existingUser = await repo.findUserByEmail(db, contributor.email);
  let userId;

  if (!existingUser) {
    userId = await repo.createUser(db, { username, email: contributor.email, hash, fullName: contributor.full_name, contributorId: contributor_id });
  } else {
    userId = existingUser.id;
    await repo.updateUserPasswordAndContributor(db, userId, hash, contributor_id);
  }

  if (permissions) {
    await repo.upsertPermissions(db, userId, permissions);
  }

  // Send email with the contributor's email as login and the generated password
  const mailService = MailService.getInstance(db);
  const notifier = new NotificationService(mailService);
  notifier.notifyContributorApproved(contributor.email, contributor.full_name, { password }).catch(() => {});

  // Ensure contributor has a member record so they can log into the member portal
  const memberName = contributor.full_name || contributor.email.split('@')[0];
  const existingMember = await repo.findMemberByEmail(db, contributor.email);
  if (!existingMember) {
    await repo.createMember(db, { name: memberName, email: contributor.email, passwordHash: hash });
  } else {
    await repo.updateMemberPasswordByEmail(db, contributor.email, hash);
  }

  return sendSuccess(res, {
    message: 'Login credentials created.',
    username: contributor.email,
    password,
  });
});

// POST /api/admin/update-contributor-access
const updateContributorAccess = asyncHandler(async (req, res) => {
  const db = req.db;
  const { user_id, is_active, permissions } = req.body || {};
  if (!user_id) return sendError(res, 'user_id required', 400);

  await repo.updateUserActive(db, user_id, is_active ? 1 : 0);

  if (permissions) {
    await repo.upsertPermissions(db, user_id, permissions);
  }
  return sendSuccess(res, { message: 'Access updated.' });
});

// POST /api/admin/reset-contributor-password
// Modal sends { user_id }. Returns { new_password } for display.
const resetContributorPassword = asyncHandler(async (req, res) => {
  const db = req.db;
  const { user_id } = req.body || {};
  if (!user_id) return sendError(res, 'user_id required', 400);

  const newPassword = crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
  const hash = await bcrypt.hash(newPassword, 10);
  await repo.updateUserPassword(db, user_id, hash);

  // Sync the new password to members table too (same person, one password)
  const user = await repo.findUserEmailById(db, user_id);
  if (user) {
    await repo.updateMemberPasswordByEmail(db, user.email, hash);
  }

  return sendSuccess(res, { message: 'Password reset.', new_password: newPassword });
});

// POST /api/delete_contributor.php (legacy path)
const deleteContributorLegacy = asyncHandler(async (req, res) => {
  const db = req.db;
  const { id } = req.body || {};
  if (!id) return sendError(res, 'ID required', 400);

  const contributor = await repo.findByIdWithContactEmail(db, id);
  if (!contributor) return sendError(res, 'Contributor not found', 404);
  const email = contributor.contact_email || contributor.email;

  const mailService = MailService.getInstance(db);
  const notifier = new NotificationService(mailService);

  if (contributor.image) deleteImage(contributor.image);
  // Detach user — they keep their account as a regular member
  await repo.detachUserFromContributor(db, id);
  await repo.deleteContributor(db, id);

  notifier.notifyContributorDowngradedToMember(email, contributor.full_name).catch(() => {});
  return sendSuccess(res, { message: 'Contributor deleted. Account preserved as member.' });
});

module.exports = {
  list, performAction, getContributorLogin, createContributorLogin,
  updateContributorAccess, resetContributorPassword, deleteContributorLegacy,
};
