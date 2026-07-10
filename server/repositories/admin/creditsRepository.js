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

async function incrementMemberBalance(db, memberId, amount) {
  await db.execute(
    'UPDATE member_credits SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE member_id = ?',
    [amount, memberId]
  );
}

async function createMemberCredits(db, memberId, balance) {
  await db.execute('INSERT INTO member_credits (member_id, balance) VALUES (?, ?)', [memberId, balance]);
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

module.exports = {
  findAllBundles, updateBundle, createBundle, deleteBundle,
  findAllCoupons, updateCoupon, createCoupon, deleteCoupon,
  findMemberById, findAllApprovedMemberIds, findMemberCredits, incrementMemberBalance, createMemberCredits, insertAdjustmentTransaction,
  findAllTransactions, countTransactions, findMemberBalance, getCreditStats,
};
