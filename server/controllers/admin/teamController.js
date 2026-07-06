const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { asyncHandler } = require('../../utils/asyncHandler');
const { sendSuccess, sendError } = require('../../utils/apiResponse');
const NotificationService = require('../../services/NotificationService');
const MailService = require('../../services/MailService');
const repo = require('../../repositories/admin/teamRepository');

// GET /api/admin/team
const list = asyncHandler(async (req, res) => {
  const rows = await repo.findAllAdmins(req.db);
  return sendSuccess(res, { admins: rows });
});

// POST /api/admin/team — create a new admin account
const create = asyncHandler(async (req, res) => {
  const db = req.db;
  const { full_name, email } = req.body || {};
  if (!full_name || !email) return sendError(res, 'full_name and email are required', 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendError(res, 'Please enter a valid email address.', 400);

  const existing = await repo.findUserByEmail(db, email);
  if (existing) return sendError(res, 'A user with this email already exists.', 409);

  const password = crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
  const hash = await bcrypt.hash(password, 10);
  const username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + Date.now().toString().slice(-4);

  await repo.createAdmin(db, { username, email, hash, fullName: full_name });

  const mailService = MailService.getInstance(db);
  const notifier = new NotificationService(mailService);
  notifier.notifyAdminAccountCreated(email, full_name, { password }).catch(() => {});

  return sendSuccess(res, { message: 'Admin account created.', username: email, password }, 201);
});

// POST /api/admin/team/:id/toggle-active
const toggleActive = asyncHandler(async (req, res) => {
  const db = req.db;
  const { id } = req.params;
  const admin = await repo.findAdminById(db, id);
  if (!admin) return sendError(res, 'Admin not found', 404);
  await repo.updateAdminActive(db, id, admin.is_active ? 0 : 1);
  return sendSuccess(res, { message: admin.is_active ? 'Admin deactivated.' : 'Admin reactivated.' });
});

// POST /api/admin/team/:id/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  const db = req.db;
  const { id } = req.params;
  const admin = await repo.findAdminById(db, id);
  if (!admin) return sendError(res, 'Admin not found', 404);

  const newPassword = crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
  const hash = await bcrypt.hash(newPassword, 10);
  await repo.updateAdminPassword(db, id, hash);

  return sendSuccess(res, { message: 'Password reset.', new_password: newPassword });
});

module.exports = { list, create, toggleActive, resetPassword };
