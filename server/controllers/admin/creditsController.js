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
  const parsedCredits = parseInt(credits);
  const parsedPrice = parseInt(price_paise);
  if (isNaN(parsedCredits) || parsedCredits <= 0) {
    return sendError(res, 'credits must be a positive integer', 400);
  }
  if (isNaN(parsedPrice) || parsedPrice <= 0) {
    return sendError(res, 'price_paise must be a positive integer', 400);
  }
  if (id) {
    await repo.updateBundle(req.db, id, { name, credits: parsedCredits, price_paise: parsedPrice, is_active: is_active === true || is_active === 1 || is_active === '1' ? 1 : 0 });
    return sendSuccess(res, { message: 'Bundle updated.' });
  }
  await repo.createBundle(req.db, { name, credits: parsedCredits, price_paise: parsedPrice });
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
  const parsedDiscount = parseInt(discount_value);
  if (isNaN(parsedDiscount) || parsedDiscount <= 0) {
    return sendError(res, 'discount_value must be a positive integer', 400);
  }
  if (discount_type === 'percentage' && parsedDiscount > 100) {
    return sendError(res, 'Percentage discount cannot exceed 100', 400);
  }
  try {
    if (id) {
      await repo.updateCoupon(req.db, id, {
        code: code.toUpperCase(), discount_type, discount_value: parsedDiscount,
        max_uses: Math.max(0, parseInt(max_uses) || 0), is_active: is_active === true || is_active === 1 || is_active === '1' ? 1 : 0, expires_at: expires_at || null,
      });
      return sendSuccess(res, { message: 'Coupon updated.' });
    }
    await repo.createCoupon(req.db, {
      code: code.toUpperCase(), discount_type, discount_value: parsedDiscount,
      max_uses: Math.max(0, parseInt(max_uses) || 0), expires_at: expires_at || null,
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
  const memberId = parseInt(member_id);
  if (isNaN(memberId) || memberId <= 0) {
    return sendError(res, 'member_id must be a positive integer', 400);
  }
  const credits = parseInt(amount);
  if (isNaN(credits) || credits === 0) {
    return sendError(res, 'amount must be a non-zero integer', 400);
  }

  const member = await repo.findMemberById(db, memberId);
  if (!member) return sendError(res, 'Member not found', 404);

  const existing = await repo.findMemberCredits(db, memberId);
  if (existing) {
    await repo.incrementMemberBalance(db, memberId, credits);
  } else {
    if (credits < 0) {
      return sendError(res, 'Cannot deduct credits from a member with no balance', 400);
    }
    await repo.createMemberCredits(db, memberId, credits);
  }

  const txNote = note || (credits > 0 ? `Admin granted ${credits} credits` : `Admin deducted ${Math.abs(credits)} credits`);
  await repo.insertAdjustmentTransaction(db, memberId, credits, txNote);

  const newBalance = await repo.findMemberBalance(db, memberId);
  return sendSuccess(res, { message: `Credits updated. New balance: ${newBalance}`, new_balance: newBalance });
});

// Shared by grantCredits and bulkGrantCredits — applies one credit adjustment
// atomically using INSERT ... ON DUPLICATE KEY UPDATE so concurrent calls for
// the same member never race on a missing row (TOCTOU → UNIQUE crash).
async function applyCreditAdjustment(db, memberId, credits, note) {
  if (credits < 0) {
    // Deduction path: guard against going negative and ensure the row exists
    const existing = await repo.findMemberCredits(db, memberId);
    if (!existing) throw new Error('no_balance');
  }
  await repo.upsertMemberBalance(db, memberId, credits);
  await repo.insertAdjustmentTransaction(db, memberId, credits, note);
  return repo.findMemberBalance(db, memberId);
}

// POST /api/admin/bulk-grant-credits — grant/deduct credits for many members
// at once: either every approved member (target: 'all') or an explicit list
// of member_ids. Best-effort per member — one failure (e.g. a deduction that
// would go negative) doesn't abort the rest; failures are reported back.
const MAX_BULK_RECIPIENTS = 5000; // sane upper bound — guards against an accidental runaway query/loop
const bulkGrantCredits = asyncHandler(async (req, res) => {
  const db = req.db;
  const { target, member_ids, amount, note } = req.body || {};

  const credits = parseInt(amount);
  if (isNaN(credits) || credits === 0) {
    return sendError(res, 'amount must be a non-zero integer', 400);
  }

  let ids;
  if (target === 'all') {
    ids = await repo.findAllApprovedMemberIds(db);
  } else if (Array.isArray(member_ids) && member_ids.length) {
    // Validate each element is a positive integer before touching the DB
    const parsed = member_ids.map(v => parseInt(v));
    if (parsed.some(v => isNaN(v) || v <= 0)) {
      return sendError(res, 'All member_ids must be positive integers', 400);
    }
    ids = [...new Set(parsed)];
  } else {
    return sendError(res, 'Provide target="all" or a non-empty member_ids array', 400);
  }

  if (ids.length === 0) {
    return sendError(res, 'No matching members found.', 404);
  }
  if (ids.length > MAX_BULK_RECIPIENTS) {
    return sendError(res, `Too many recipients (${ids.length}). Max ${MAX_BULK_RECIPIENTS} per bulk action.`, 400);
  }

  const txNote = note || (credits > 0 ? `Bulk admin grant: ${credits} credits` : `Bulk admin deduction: ${Math.abs(credits)} credits`);

  let succeeded = 0;
  const failed = [];
  for (const memberId of ids) {
    try {
      await applyCreditAdjustment(db, memberId, credits, txNote);
      succeeded++;
    } catch (err) {
      failed.push({ member_id: memberId, reason: err.message === 'no_balance' ? 'No existing balance to deduct from' : 'Failed' });
    }
  }

  return sendSuccess(res, {
    message: `Applied to ${succeeded}/${ids.length} member${ids.length === 1 ? '' : 's'}.`,
    succeeded,
    failed_count: failed.length,
    failed,
  });
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
  grantCredits, bulkGrantCredits, listTransactions, getMemberCredits, getCreditStats,
};
