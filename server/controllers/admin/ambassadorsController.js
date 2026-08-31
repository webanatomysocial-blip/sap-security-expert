const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { asyncHandler } = require('../../utils/asyncHandler');
const { sendSuccess, sendError } = require('../../utils/apiResponse');
const { deleteImage } = require('../../utils/helpers');
const NotificationService = require('../../services/NotificationService');
const MailService = require('../../services/MailService');
const AuditService = require('../../services/AuditService');
const repo = require('../../repositories/admin/ambassadorsRepository');

// GET /api/admin/ambassadors — bare array
const list = asyncHandler(async (req, res) => {
  const rows = await repo.findAllActive(req.db);
  return res.json(rows);
});

// GET /api/admin/ambassador-badge-history?country=India
const getBadgeHistory = asyncHandler(async (req, res) => {
  const country = req.query.country;
  if (!country) return sendError(res, 'country is required.', 400);
  const rows = await repo.findBadgeHistoryByCountry(req.db, country);
  return sendSuccess(res, { history: rows });
});

// POST /api/admin/ambassadors — approve / reject / deactivate / reactivate / delete
const performAction = asyncHandler(async (req, res) => {
  const db = req.db;
  const body = req.body || {};
  const id = body.id;
  const reason = body.reason || body.rejection_reason || '';
  const raw = (body.action || body.status || '').toLowerCase();
  const ACTION = {
    approved: 'approve', approve: 'approve', rejected: 'reject', reject: 'reject', deleted: 'delete', delete: 'delete',
    deactivated: 'deactivate', deactivate: 'deactivate', reactivate: 'reactivate',
    grant_badge: 'grant_badge', revoke_badge: 'revoke_badge',
  };
  const normalised = ACTION[raw];

  if (!id || !normalised) return sendError(res, 'id and action are required', 400);

  const ambassador = await repo.findById(db, id);
  if (!ambassador) return sendError(res, 'Ambassador not found', 404);

  const mailService = MailService.getInstance(db);
  const notifier = new NotificationService(mailService);

  if (normalised === 'approve') {
    await repo.approveAmbassador(db, id);

    const existingUser = await repo.findUserByEmail(db, ambassador.email);
    let password = null;

    if (!existingUser) {
      password = crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
      const hash = await bcrypt.hash(password, 10);
      const username = ambassador.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + Date.now().toString().slice(-4);
      await repo.createUser(db, { username, email: ambassador.email, hash, fullName: ambassador.full_name, ambassadorId: id });
    } else {
      await repo.activateUserForAmbassador(db, id, ambassador.email);
    }

    // Ensure the ambassador has a member record so they can log into the member portal
    const memberName = ambassador.full_name || ambassador.email.split('@')[0];
    const existingMember = await repo.findMemberByEmail(db, ambassador.email);
    if (!existingMember) {
      const userPasswordRow = await repo.findUserPasswordByEmail(db, ambassador.email);
      const memberHash = password ? await bcrypt.hash(password, 10) : userPasswordRow?.password;
      if (memberHash) {
        await repo.createMember(db, { name: memberName, email: ambassador.email, passwordHash: memberHash });
      }
    } else if (password) {
      const approveHash = await bcrypt.hash(password, 10);
      await repo.updateMemberPasswordByEmail(db, ambassador.email, approveHash);
    }

    const audit = AuditService.fromRequest(db, req);
    notifier.notifyAmbassadorApproved(ambassador.email, ambassador.full_name, { password }).catch(() => {});
    audit.logReq('ambassador_approved', 'ambassador', id, `Approved ambassador: ${ambassador.full_name} (${ambassador.email})`).catch(() => {});
    return sendSuccess(res, { message: 'Ambassador approved.' });
  } else if (normalised === 'reject') {
    await repo.updateStatus(db, id, 'rejected');
    notifier.notifyAmbassadorRejected(ambassador.email, ambassador.full_name, reason || 'Application not approved.').catch(() => {});
    const audit = AuditService.fromRequest(db, req);
    audit.logReq('ambassador_rejected', 'ambassador', id, `Rejected ambassador: ${ambassador.full_name} (${ambassador.email}). Reason: ${reason || 'none'}`).catch(() => {});
    return sendSuccess(res, { message: 'Ambassador rejected.' });
  } else if (normalised === 'deactivate') {
    await repo.deactivateAmbassador(db, id);
    notifier.notifyAmbassadorDeactivated(ambassador.email, ambassador.full_name, reason || 'Deactivated by admin.').catch(() => {});
    const audit = AuditService.fromRequest(db, req);
    audit.logReq('ambassador_deactivated', 'ambassador', id, `Deactivated ambassador: ${ambassador.full_name} (${ambassador.email})`).catch(() => {});
    return sendSuccess(res, { message: 'Ambassador deactivated.' });
  } else if (normalised === 'reactivate') {
    await repo.reactivateAmbassador(db, id);
    notifier.notifyAmbassadorReactivated(ambassador.email, ambassador.full_name).catch(() => {});
    const audit = AuditService.fromRequest(db, req);
    audit.logReq('ambassador_reactivated', 'ambassador', id, `Reactivated ambassador: ${ambassador.full_name} (${ambassador.email})`).catch(() => {});
    return sendSuccess(res, { message: 'Ambassador reactivated.' });
  } else if (normalised === 'grant_badge') {
    // One badge per country — grantBadge revokes any existing holder there.
    const year = parseInt(body.badge_year) || new Date().getFullYear();
    await repo.grantBadge(db, id, year);
    const audit = AuditService.fromRequest(db, req);
    audit.logReq('ambassador_badge_granted', 'ambassador', id, `Granted Country Ambassador badge (${year}) to: ${ambassador.full_name} (${ambassador.email})`).catch(() => {});
    return sendSuccess(res, { message: 'Badge granted.' });
  } else if (normalised === 'revoke_badge') {
    await repo.revokeBadge(db, id);
    const audit = AuditService.fromRequest(db, req);
    audit.logReq('ambassador_badge_revoked', 'ambassador', id, `Revoked Country Ambassador badge from: ${ambassador.full_name} (${ambassador.email})`).catch(() => {});
    return sendSuccess(res, { message: 'Badge revoked.' });
  } else if (normalised === 'delete') {
    if (ambassador.image) deleteImage(ambassador.image);
    await repo.detachUserFromAmbassador(db, id);
    await repo.deleteAmbassador(db, id);
    const audit = AuditService.fromRequest(db, req);
    audit.logReq('ambassador_deleted', 'ambassador', id, `Deleted ambassador: ${ambassador.full_name} (${ambassador.email})`).catch(() => {});
    return sendSuccess(res, { message: 'Ambassador deleted. User account preserved as member.' });
  } else {
    return sendError(res, 'Unknown action', 400);
  }
});

// GET /api/admin/ambassador-login?ambassador_id=X
const getAmbassadorLogin = asyncHandler(async (req, res) => {
  const db = req.db;
  const { ambassador_id } = req.query;
  if (!ambassador_id) return sendError(res, 'ambassador_id required', 400);

  const user = await repo.findUserByAmbassadorId(db, ambassador_id);
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

// POST /api/admin/create-ambassador-login
const createAmbassadorLogin = asyncHandler(async (req, res) => {
  const db = req.db;
  const { ambassador_id, permissions } = req.body || {};
  if (!ambassador_id) return sendError(res, 'ambassador_id required', 400);

  const ambassador = await repo.findById(db, ambassador_id);
  if (!ambassador) return sendError(res, 'Ambassador not found', 404);
  // Credentials must never go out before the application is actually
  // approved — this endpoint used to create+email a login regardless of
  // status, which meant a login could be sent for a still-pending
  // application (confirmed: login only worked once status caught up later).
  if (ambassador.status !== 'approved') {
    return sendError(res, 'This application must be approved before a login can be created.', 400);
  }

  const password = crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
  const hash = await bcrypt.hash(password, 10);
  const username = ambassador.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + Date.now().toString().slice(-4);

  const existingUser = await repo.findUserByEmail(db, ambassador.email);
  let userId;

  if (!existingUser) {
    userId = await repo.createUser(db, { username, email: ambassador.email, hash, fullName: ambassador.full_name, ambassadorId: ambassador_id });
  } else {
    userId = existingUser.id;
    await repo.updateUserPasswordAndAmbassador(db, userId, hash, ambassador_id);
  }

  if (permissions) await repo.upsertPermissions(db, userId, permissions);

  const mailService = MailService.getInstance(db);
  const notifier = new NotificationService(mailService);
  notifier.notifyAmbassadorApproved(ambassador.email, ambassador.full_name, { password }).catch(() => {});

  const memberName = ambassador.full_name || ambassador.email.split('@')[0];
  const existingMember = await repo.findMemberByEmail(db, ambassador.email);
  if (!existingMember) {
    await repo.createMember(db, { name: memberName, email: ambassador.email, passwordHash: hash });
  } else {
    await repo.updateMemberPasswordByEmail(db, ambassador.email, hash);
  }

  const audit = AuditService.fromRequest(db, req);
  audit.logReq('ambassador_login_created', 'ambassador', ambassador_id, `Created login for ambassador: ${ambassador.full_name} (${ambassador.email})`).catch(() => {});
  return sendSuccess(res, { message: 'Login credentials created.', username: ambassador.email, password });
});

// POST /api/admin/update-ambassador-access
const updateAmbassadorAccess = asyncHandler(async (req, res) => {
  const db = req.db;
  const { user_id, is_active, permissions } = req.body || {};
  if (!user_id) return sendError(res, 'user_id required', 400);

  await repo.updateUserActive(db, user_id, is_active ? 1 : 0);
  if (permissions) await repo.upsertPermissions(db, user_id, permissions);

  const audit = AuditService.fromRequest(db, req);
  const permSummary = permissions ? Object.entries(permissions).filter(([, v]) => v).map(([k]) => k).join(', ') || 'none' : 'unchanged';
  audit.logReq('ambassador_access_updated', 'user', user_id, `User #${user_id} active=${is_active ? 1 : 0}, permissions: ${permSummary}`).catch(() => {});
  return sendSuccess(res, { message: 'Access updated.' });
});

// POST /api/admin/reset-ambassador-password
const resetAmbassadorPassword = asyncHandler(async (req, res) => {
  const db = req.db;
  const { user_id } = req.body || {};
  if (!user_id) return sendError(res, 'user_id required', 400);

  const newPassword = crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
  const hash = await bcrypt.hash(newPassword, 10);
  await repo.updateUserPassword(db, user_id, hash);

  const user = await repo.findUserWithAmbassadorNameById(db, user_id);
  if (user) {
    await repo.updateMemberPasswordByEmail(db, user.email, hash);
    const mailService = MailService.getInstance(db);
    const notifier = new NotificationService(mailService);
    notifier.notifyAmbassadorPasswordReset(user.email, user.full_name || user.email, newPassword).catch(() => {});
  }

  const audit = AuditService.fromRequest(db, req);
  audit.logReq('ambassador_password_reset', 'user', user_id, `Password reset for ambassador user #${user_id}${user ? ` (${user.email})` : ''}`).catch(() => {});
  return sendSuccess(res, { message: 'Password reset. New credentials have been emailed to them.', new_password: newPassword });
});

module.exports = {
  list, performAction, getAmbassadorLogin, createAmbassadorLogin, updateAmbassadorAccess, resetAmbassadorPassword,
  getBadgeHistory,
};
