// Duplicate-key error across mysql2 (ER_DUP_ENTRY / errno 1062) and better-sqlite3
// (SQLITE_CONSTRAINT_UNIQUE / SQLITE_CONSTRAINT).
function isDuplicateKeyError(err) {
  return err && (err.code === 'ER_DUP_ENTRY' || err.errno === 1062 ||
    err.code === 'SQLITE_CONSTRAINT_UNIQUE' || err.code === 'SQLITE_CONSTRAINT');
}

async function getMemberBalance(db, memberId) {
  const [rows] = await db.execute(
    'SELECT balance FROM member_credits WHERE member_id = ? LIMIT 1', [memberId]
  );
  return rows.length ? rows[0].balance : 0;
}

// Returns false if orderId was already processed (replay guard).
// Both /payments/verify (client-side, immediately after checkout) and the
// /payments/webhook handler (server-to-server, may arrive around the same time)
// call this for the same order, so it must be safe under concurrent execution —
// not just sequential double-calls. The INSERT happens first and is the actual
// idempotency guard (backed by the UNIQUE KEY on razorpay_order_id); the balance
// UPDATE only runs if that INSERT succeeds, and both are wrapped in one
// transaction so a losing concurrent call never partially applies a credit.
async function addCredits(db, memberId, amount, amountPaise = 0, note = '', orderId = null) {
  await db.beginTransaction();
  try {
    try {
      await db.execute(
        "INSERT INTO credit_transactions (member_id, type, credits_delta, amount_paise, note, razorpay_order_id) VALUES (?, 'purchase', ?, ?, ?, ?)",
        [memberId, amount, amountPaise, note, orderId || null]
      );
    } catch (err) {
      if (orderId && isDuplicateKeyError(err)) {
        await db.rollback();
        return false; // already fulfilled by a concurrent request — no double credit
      }
      throw err;
    }

    const [rows] = await db.execute('SELECT id FROM member_credits WHERE member_id = ? LIMIT 1', [memberId]);
    if (rows.length) {
      await db.execute(
        'UPDATE member_credits SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE member_id = ?',
        [amount, memberId]
      );
    } else {
      await db.execute('INSERT INTO member_credits (member_id, balance) VALUES (?, ?)', [memberId, amount]);
    }

    await db.commit();
    return true;
  } catch (err) {
    await db.rollback();
    throw err;
  }
}

// Refund reversal transaction — idempotent via the UNIQUE KEY on razorpay_refund_id.
// Balance is clamped at 0 in case the member already spent some of the credits
// before the refund landed. Returns true if the reversal was newly applied,
// false if it had already been applied by a previous webhook delivery.
async function reverseRefund(db, { memberId, creditsToReverse, refundAmountPaise, orderId, refundId }) {
  await db.beginTransaction();
  let alreadyReversed = false;
  try {
    try {
      await db.execute(
        "INSERT INTO credit_transactions (member_id, type, credits_delta, amount_paise, note, razorpay_refund_id) VALUES (?, 'refund', ?, ?, ?, ?)",
        [memberId, -creditsToReverse, -(refundAmountPaise || 0), `Refund for order ${orderId}`, refundId]
      );
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        alreadyReversed = true; // already reversed by a previous delivery of this webhook
      } else {
        throw err;
      }
    }

    if (alreadyReversed) {
      await db.rollback();
      return false;
    }

    // Clamp in application code, not SQL — GREATEST() (MySQL) and the
    // 2-arg MAX() (SQLite) aren't portable across the two engines this
    // app runs on, so read-then-clamp avoids relying on either.
    const currentBalance = await getMemberBalance(db, memberId);
    const newBalance = Math.max(currentBalance - creditsToReverse, 0);
    await db.execute(
      'UPDATE member_credits SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE member_id = ?',
      [newBalance, memberId]
    );
    await db.commit();
    return true;
  } catch (err) {
    await db.rollback();
    throw err;
  }
}

async function findActiveBundles(db) {
  const [rows] = await db.execute(
    'SELECT id, name, credits, price_paise FROM credit_bundles WHERE is_active = 1 ORDER BY price_paise ASC'
  );
  return rows;
}

async function findMemberUnlocks(db, memberId) {
  const [rows] = await db.execute(
    'SELECT blog_slug, credits_spent, unlocked_at FROM member_blog_unlocks WHERE member_id = ? ORDER BY unlocked_at DESC',
    [memberId]
  );
  return rows;
}

async function findTransactionHistory(db, memberId) {
  const [rows] = await db.execute(
    `SELECT
       ct.id, ct.type, ct.credits_delta, ct.amount_paise, ct.note,
       ct.created_at,
       cb.name AS bundle_name
     FROM credit_transactions ct
     LEFT JOIN payment_orders po ON po.razorpay_order_id = ct.razorpay_order_id
     LEFT JOIN credit_bundles cb ON cb.id = po.bundle_id
     WHERE ct.member_id = ?
     ORDER BY ct.created_at DESC
     LIMIT 100`,
    [memberId]
  );
  return rows;
}

async function findUnlockHistory(db, memberId) {
  const [rows] = await db.execute(
    `SELECT
       u.blog_slug, u.credits_spent, u.unlocked_at,
       b.title AS blog_title, b.category
     FROM member_blog_unlocks u
     LEFT JOIN blogs b ON b.slug = u.blog_slug
     WHERE u.member_id = ?
     ORDER BY u.unlocked_at DESC
     LIMIT 100`,
    [memberId]
  );
  return rows;
}

async function findInvoiceData(db, txId, memberId) {
  const [rows] = await db.execute(
    `SELECT ct.id, ct.credits_delta, ct.amount_paise, ct.created_at, ct.razorpay_order_id,
            cb.name AS bundle_name,
            m.name AS member_name, m.email AS member_email,
            po.final_price_paise, po.bundle_price_paise, co.code AS coupon_code,
            co.discount_type, co.discount_value
     FROM credit_transactions ct
     JOIN members m ON m.id = ct.member_id
     LEFT JOIN payment_orders po ON po.razorpay_order_id = ct.razorpay_order_id
     LEFT JOIN credit_bundles cb ON cb.id = po.bundle_id
     LEFT JOIN coupons co ON co.id = po.coupon_id
     WHERE ct.id = ? AND ct.member_id = ? AND ct.type = 'purchase'
     LIMIT 1`,
    [txId, memberId]
  );
  return rows[0] || null;
}

async function findActiveCouponByCode(db, code) {
  const [rows] = await db.execute(
    `SELECT * FROM coupons WHERE UPPER(code) = UPPER(?) AND is_active = 1
     AND (expires_at IS NULL OR expires_at > NOW())
     AND (max_uses = 0 OR used_count < max_uses)
     LIMIT 1`,
    [code]
  );
  return rows[0] || null;
}

async function findActiveBundleById(db, bundleId) {
  const [rows] = await db.execute('SELECT * FROM credit_bundles WHERE id = ? AND is_active = 1 LIMIT 1', [bundleId]);
  return rows[0] || null;
}

async function findBundleById(db, bundleId) {
  const [rows] = await db.execute('SELECT * FROM credit_bundles WHERE id = ? LIMIT 1', [bundleId]);
  return rows[0] || null;
}

async function insertPaymentOrder(db, f) {
  await db.execute(
    `INSERT INTO payment_orders (razorpay_order_id, member_id, bundle_id, bundle_credits, bundle_price_paise, coupon_id, final_price_paise)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [f.orderId, f.memberId, f.bundleId, f.bundleCredits, f.bundlePricePaise, f.couponId, f.finalPricePaise]
  );
}

async function findOrderByIdAndMember(db, orderId, memberId) {
  const [rows] = await db.execute(
    'SELECT * FROM payment_orders WHERE razorpay_order_id = ? AND member_id = ? LIMIT 1',
    [orderId, memberId]
  );
  return rows[0] || null;
}

async function findOrderById(db, orderId) {
  const [rows] = await db.execute(
    'SELECT * FROM payment_orders WHERE razorpay_order_id = ? LIMIT 1', [orderId]
  );
  return rows[0] || null;
}

async function markOrderFulfilled(db, orderId, razorpayPaymentId) {
  await db.execute(
    'UPDATE payment_orders SET fulfilled = 1, razorpay_payment_id = ? WHERE razorpay_order_id = ?',
    [razorpayPaymentId || null, orderId]
  );
}

async function incrementCouponUsage(db, couponId) {
  await db.execute('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?', [couponId]).catch(() => {});
}

async function findExistingUnlock(db, memberId, blogSlug) {
  const [rows] = await db.execute(
    'SELECT id FROM member_blog_unlocks WHERE member_id = ? AND blog_slug = ? LIMIT 1',
    [memberId, blogSlug]
  );
  return rows.length > 0;
}

async function findPremiumBlogBySlug(db, slug) {
  const [rows] = await db.execute(
    "SELECT slug, credits_required, is_premium FROM blogs WHERE slug = ? AND status IN ('approved','published') LIMIT 1",
    [slug]
  );
  return rows[0] || null;
}

async function deductCreditsIfSufficient(db, memberId, creditsNeeded) {
  await db.execute(
    'UPDATE member_credits SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE member_id = ? AND balance >= ?',
    [creditsNeeded, memberId, creditsNeeded]
  );
}

async function insertSpendTransaction(db, memberId, creditsNeeded, note) {
  await db.execute(
    "INSERT INTO credit_transactions (member_id, type, credits_delta, note) VALUES (?, 'spend', ?, ?)",
    [memberId, -creditsNeeded, note]
  );
}

async function insertBlogUnlock(db, memberId, slug, creditsSpent) {
  await db.execute(
    'INSERT IGNORE INTO member_blog_unlocks (member_id, blog_slug, credits_spent) VALUES (?, ?, ?)',
    [memberId, slug, creditsSpent]
  );
}

async function findApprovedBlogBySlug(db, slug) {
  const [rows] = await db.execute(
    "SELECT id FROM blogs WHERE slug = ? AND status IN ('approved','published') LIMIT 1", [slug]
  );
  return rows.length > 0;
}

async function findMemberProfileForBonus(db, memberId) {
  const [rows] = await db.execute(
    'SELECT name, phone, location, company_name, job_role, profile_image FROM members WHERE id=? LIMIT 1', [memberId]
  );
  return rows[0] || null;
}

async function countProductReviews(db, memberId) {
  const [rows] = await db.execute(
    "SELECT COUNT(*) as cnt FROM credit_transactions WHERE member_id = ? AND note LIKE 'Product review: %'",
    [memberId]
  );
  return rows[0]?.cnt || 0;
}

// Downloadable-file blocks are embedded in blog content as
// `<div data-file-url="..." data-credits="N" ...>` (see DownloadBlock.jsx /
// DynamicBlog.jsx). That markup, once saved, is the only place a file's
// price is ever recorded — there's no separate pricing table. Narrow the
// candidate rows with a LIKE on `%file_url%` (fast, uses no index but keeps
// the result set small); the exact per-tag match happens in JS.
async function findBlogsReferencingFile(db, fileUrl) {
  const [rows] = await db.execute(
    `SELECT content, draft_content FROM blogs
     WHERE status IN ('approved','published')
       AND (content LIKE ? OR draft_content LIKE ?)`,
    [`%${fileUrl}%`, `%${fileUrl}%`]
  );
  return rows;
}

module.exports = {
  isDuplicateKeyError, getMemberBalance, addCredits, reverseRefund,
  findActiveBundles, findMemberUnlocks, findTransactionHistory, findUnlockHistory, findInvoiceData,
  findActiveCouponByCode, findActiveBundleById, findBundleById, insertPaymentOrder,
  findOrderByIdAndMember, findOrderById, markOrderFulfilled, incrementCouponUsage,
  findExistingUnlock, findPremiumBlogBySlug, deductCreditsIfSufficient, insertSpendTransaction, insertBlogUnlock,
  findApprovedBlogBySlug, findMemberProfileForBonus, countProductReviews, findBlogsReferencingFile,
};
