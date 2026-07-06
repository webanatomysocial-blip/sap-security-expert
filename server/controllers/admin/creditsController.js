const { asyncHandler } = require('../../utils/asyncHandler');
const { sendSuccess, sendError } = require('../../utils/apiResponse');
const repo = require('../../repositories/admin/creditsRepository');

// GET /api/admin/bundles
const listBundles = asyncHandler(async (req, res) => {
  const bundles = await repo.findAllBundles(req.db);
  return sendSuccess(res, { bundles });
});

// POST /api/admin/bundles
const saveBundle = asyncHandler(async (req, res) => {
  const { id, name, credits, price_paise, is_active } = req.body || {};
  if (!name || !credits || !price_paise) {
    return sendError(res, 'name, credits, and price_paise are required', 400);
  }
  if (id) {
    await repo.updateBundle(req.db, id, { name, credits: parseInt(credits), price_paise: parseInt(price_paise), is_active: is_active ? 1 : 0 });
    return sendSuccess(res, { message: 'Bundle updated.' });
  }
  await repo.createBundle(req.db, { name, credits: parseInt(credits), price_paise: parseInt(price_paise) });
  return sendSuccess(res, { message: 'Bundle created.' });
});

// DELETE /api/admin/bundles/:id
const deleteBundle = asyncHandler(async (req, res) => {
  await repo.deleteBundle(req.db, req.params.id);
  return sendSuccess(res, { message: 'Bundle deleted.' });
});

// GET /api/admin/coupons
const listCoupons = asyncHandler(async (req, res) => {
  const coupons = await repo.findAllCoupons(req.db);
  return sendSuccess(res, { coupons });
});

// POST /api/admin/coupons
// Kept as an explicit try/catch (not pure asyncHandler): needs to inspect
// the error to distinguish a duplicate-code constraint violation (safe,
// specific 409) from a genuinely unexpected error (which still goes through
// next(err) to the centralized handler — not returned as a raw err.message,
// unlike the original).
const saveCoupon = async (req, res, next) => {
  const { id, code, discount_type, discount_value, max_uses = 0, is_active = 1, expires_at } = req.body || {};
  if (!code || !discount_type || discount_value == null) {
    return sendError(res, 'code, discount_type, discount_value are required', 400);
  }
  if (!['percentage', 'fixed'].includes(discount_type)) {
    return sendError(res, 'discount_type must be "percentage" or "fixed"', 400);
  }
  try {
    if (id) {
      await repo.updateCoupon(req.db, id, {
        code: code.toUpperCase(), discount_type, discount_value: parseInt(discount_value),
        max_uses: parseInt(max_uses), is_active: is_active ? 1 : 0, expires_at: expires_at || null,
      });
      return sendSuccess(res, { message: 'Coupon updated.' });
    }
    await repo.createCoupon(req.db, {
      code: code.toUpperCase(), discount_type, discount_value: parseInt(discount_value),
      max_uses: parseInt(max_uses), expires_at: expires_at || null,
    });
    return sendSuccess(res, { message: 'Coupon created.' });
  } catch (err) {
    if (err.message?.includes('UNIQUE') || err.message?.includes('Duplicate')) {
      return sendError(res, 'Coupon code already exists.', 409);
    }
    return next(err);
  }
};

// DELETE /api/admin/coupons/:id
const deleteCoupon = asyncHandler(async (req, res) => {
  await repo.deleteCoupon(req.db, req.params.id);
  return sendSuccess(res, { message: 'Coupon deleted.' });
});

// POST /api/admin/grant-credits — manually add/adjust credits for a member
const grantCredits = asyncHandler(async (req, res) => {
  const db = req.db;
  const { member_id, amount, note } = req.body || {};
  if (!member_id || amount == null) {
    return sendError(res, 'member_id and amount are required', 400);
  }
  const credits = parseInt(amount);
  if (isNaN(credits) || credits === 0) {
    return sendError(res, 'amount must be a non-zero integer', 400);
  }

  const member = await repo.findMemberById(db, member_id);
  if (!member) return sendError(res, 'Member not found', 404);

  const existing = await repo.findMemberCredits(db, member_id);
  if (existing) {
    await repo.incrementMemberBalance(db, member_id, credits);
  } else {
    if (credits < 0) {
      return sendError(res, 'Cannot deduct credits from a member with no balance', 400);
    }
    await repo.createMemberCredits(db, member_id, credits);
  }

  const txNote = note || (credits > 0 ? `Admin granted ${credits} credits` : `Admin deducted ${Math.abs(credits)} credits`);
  await repo.insertAdjustmentTransaction(db, member_id, credits, txNote);

  const newBalance = await repo.findMemberBalance(db, member_id);
  return sendSuccess(res, { message: `Credits updated. New balance: ${newBalance}`, new_balance: newBalance });
});

// GET /api/admin/credit-transactions — all transactions across all members
const listTransactions = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
  const offset = (page - 1) * limit;

  const transactions = await repo.findAllTransactions(req.db, limit, offset);
  const total = await repo.countTransactions(req.db);
  return sendSuccess(res, { transactions, total, page, limit });
});

// GET /api/admin/member-credits/:id — get a specific member's balance
const getMemberCredits = asyncHandler(async (req, res) => {
  const balance = await repo.findMemberBalance(req.db, req.params.id);
  return sendSuccess(res, { balance });
});

// GET /api/admin/credit-stats
const getCreditStats = asyncHandler(async (req, res) => {
  const stats = await repo.getCreditStats(req.db);
  return sendSuccess(res, { stats });
});

module.exports = {
  listBundles, saveBundle, deleteBundle, listCoupons, saveCoupon, deleteCoupon,
  grantCredits, listTransactions, getMemberCredits, getCreditStats,
};
