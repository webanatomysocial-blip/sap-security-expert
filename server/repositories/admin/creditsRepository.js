const { isSQLite } = require('../../db');

async function findAllBundles(db) {
  const [rows] = await db.execute('SELECT * FROM credit_bundles ORDER BY price_paise ASC');
  return rows;
}

async function updateBundle(db, id, { name, credits, price_paise, is_active }) {
  await db.execute(
    'UPDATE credit_bundles SET name=?, credits=?, price_paise=?, is_active=? WHERE id=?',
    [name, credits, price_paise, is_active, id]
  );
}

async function createBundle(db, { name, credits, price_paise }) {
  await db.execute(
    'INSERT INTO credit_bundles (name, credits, price_paise, is_active) VALUES (?, ?, ?, 1)',
    [name, credits, price_paise]
  );
}

async function deleteBundle(db, id) {
  await db.execute('DELETE FROM credit_bundles WHERE id=?', [id]);
}

async function findAllCoupons(db) {
  const [rows] = await db.execute('SELECT * FROM coupons ORDER BY created_at DESC');
  return rows;
}

async function updateCoupon(db, id, { code, discount_type, discount_value, max_uses, is_active, expires_at }) {
  await db.execute(
    'UPDATE coupons SET code=?, discount_type=?, discount_value=?, max_uses=?, is_active=?, expires_at=? WHERE id=?',
    [code, discount_type, discount_value, max_uses, is_active, expires_at, id]
  );
}

async function createCoupon(db, { code, discount_type, discount_value, max_uses, expires_at }) {
  await db.execute(
    'INSERT INTO coupons (code, discount_type, discount_value, max_uses, is_active, expires_at) VALUES (?, ?, ?, ?, 1, ?)',
    [code, discount_type, discount_value, max_uses, expires_at]
  );
}

async function deleteCoupon(db, id) {
  await db.execute('DELETE FROM coupons WHERE id=?', [id]);
}

async function findMemberById(db, memberId) {
  const [rows] = await db.execute('SELECT id, name, email FROM members WHERE id = ? LIMIT 1', [memberId]);
  return rows[0] || null;
}

async function findAllApprovedMemberIds(db) {
  const [rows] = await db.execute(
    "SELECT id FROM members WHERE status = 'approved' AND (is_deleted IS NULL OR is_deleted = 0)"
  );
  return rows.map((r) => r.id);
}

async function findMemberCredits(db, memberId) {
  const [rows] = await db.execute('SELECT id, balance FROM member_credits WHERE member_id = ? LIMIT 1', [memberId]);
  return rows[0] || null;
}

// Same as findMemberCredits but takes a row-level lock (MySQL only — SQLite
// has no FOR UPDATE syntax). Must be called inside a transaction. Used by
// applyCreditAdjustment to prevent two concurrent adjustments for the same
// member from both reading the same "before" balance and each logging a
// credits_delta that double-counts (or misses) the other's change.
async function findMemberCreditsForUpdate(db, memberId) {
  const [rows] = await db.execute('SELECT id, balance FROM member_credits WHERE member_id = ? LIMIT 1 FOR UPDATE', [memberId]);
  return rows[0] || null;
}

// Atomic upsert: creates the row if missing, otherwise increments (clamped
// at 0 so deductions can't go negative). Must stay atomic — this is called
// from bulkGrantCredits in a loop across many members, so a SELECT-then-
// INSERT/UPDATE here would TOCTOU-race a concurrent grant to the same member
// into a UNIQUE-constraint crash on member_id.
//
// GREATEST() and MySQL's "ON DUPLICATE KEY UPDATE ... VALUES(col)" have no
// SQLite equivalent (the dev-mode SQL translator can't rewrite them without
// losing the increment semantics), so this branches per-backend rather than
// relying on the generic translator: MySQL gets its native upsert, SQLite
// gets its own ON CONFLICT upsert using MAX() instead of GREATEST().
async function upsertMemberBalance(db, memberId, amount) {
  if (isSQLite) {
    await db.execute(
      `INSERT INTO member_credits (member_id, balance)
       VALUES (?, MAX(0, ?))
       ON CONFLICT(member_id) DO UPDATE SET
         balance = MAX(0, balance + ?),
         updated_at = CURRENT_TIMESTAMP`,
      [memberId, amount, amount]
    );
  } else {
    await db.execute(
      `INSERT INTO member_credits (member_id, balance)
       VALUES (?, GREATEST(0, ?))
       ON DUPLICATE KEY UPDATE
         balance = GREATEST(0, balance + ?),
         updated_at = CURRENT_TIMESTAMP`,
      [memberId, amount, amount]
    );
  }
}

async function insertAdjustmentTransaction(db, memberId, credits, note) {
  await db.execute(
    "INSERT INTO credit_transactions (member_id, type, credits_delta, amount_paise, note) VALUES (?, 'admin_adjustment', ?, 0, ?)",
    [memberId, credits, note]
  );
}

async function findAllTransactions(db, limit, offset) {
  const [rows] = await db.execute(
    `SELECT ct.id, ct.type, ct.credits_delta, ct.amount_paise, ct.note, ct.created_at,
            m.id AS member_id, m.name AS member_name, m.email AS member_email,
            cb.name AS bundle_name
     FROM credit_transactions ct
     JOIN members m ON m.id = ct.member_id
     LEFT JOIN payment_orders po ON po.razorpay_order_id = ct.razorpay_order_id
     LEFT JOIN credit_bundles cb ON cb.id = po.bundle_id
     ORDER BY ct.created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return rows;
}

async function countTransactions(db) {
  const [[row]] = await db.execute('SELECT COUNT(*) AS total FROM credit_transactions');
  return row.total;
}

async function findMemberBalance(db, memberId) {
  const [rows] = await db.execute('SELECT balance FROM member_credits WHERE member_id = ? LIMIT 1', [memberId]);
  return rows[0]?.balance ?? 0;
}

async function getCreditStats(db) {
  const [totalCredits] = await db.execute('SELECT COALESCE(SUM(balance),0) as total FROM member_credits');
  const [totalUnlocks] = await db.execute('SELECT COUNT(*) as total FROM member_blog_unlocks');
  const [totalPurchases] = await db.execute("SELECT COUNT(*) as total, COALESCE(SUM(amount_paise),0) as revenue FROM credit_transactions WHERE type='purchase'");
  return {
    total_credits_outstanding: totalCredits[0]?.total || 0,
    total_blog_unlocks: totalUnlocks[0]?.total || 0,
    total_purchases: totalPurchases[0]?.total || 0,
    total_revenue_paise: totalPurchases[0]?.revenue || 0,
  };
}

async function findAllActivities(db) {
  const [rows] = await db.execute('SELECT * FROM credit_activities ORDER BY id ASC');
  return rows;
}

async function findActivityByKey(db, key) {
  const [rows] = await db.execute('SELECT * FROM credit_activities WHERE `key`=? LIMIT 1', [key]);
  return rows[0] || null;
}

async function upsertActivity(db, { id, key, label, description, credits, is_active }) {
  if (id) {
    await db.execute(
      'UPDATE credit_activities SET label=?, description=?, credits=?, is_active=? WHERE id=?',
      [label, description || '', credits, is_active, id]
    );
  } else {
    await db.execute(
      'INSERT INTO credit_activities (`key`, label, description, credits, is_active) VALUES (?, ?, ?, ?, ?)',
      [key, label, description || '', credits, is_active ?? 1]
    );
  }
}

async function deleteActivity(db, id) {
  await db.execute('DELETE FROM credit_activities WHERE id=?', [id]);
}

// ── Achievement Types ─────────────────────────────────────────────────────────
async function findAllAchievementTypes(db) {
  const [rows] = await db.execute('SELECT * FROM member_achievement_types ORDER BY id ASC');
  return rows;
}

async function upsertAchievementType(db, { id, label, description, icon, color, bg, criteria }) {
  await db.execute(
    `INSERT INTO member_achievement_types (id, label, description, icon, color, bg, criteria) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE label=VALUES(label), description=VALUES(description), icon=VALUES(icon), color=VALUES(color), bg=VALUES(bg), criteria=VALUES(criteria)`,
    [id, label, description, icon, color, bg, criteria]
  );
}

async function deleteAchievementType(db, id) {
  await db.execute('DELETE FROM member_achievement_types WHERE id=?', [id]);
}

module.exports = {
  findAllBundles, updateBundle, createBundle, deleteBundle,
  findAllCoupons, updateCoupon, createCoupon, deleteCoupon,
  findMemberById, findAllApprovedMemberIds, findMemberCredits, findMemberCreditsForUpdate, upsertMemberBalance, insertAdjustmentTransaction,
  findAllTransactions, countTransactions, findMemberBalance, getCreditStats,
  findAllActivities, findActivityByKey, upsertActivity, deleteActivity,
  findAllAchievementTypes, upsertAchievementType, deleteAchievementType,
};
