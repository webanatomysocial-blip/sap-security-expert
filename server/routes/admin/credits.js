const router = require('express').Router();
const { requireAdmin } = require('../../middleware/auth');

// ── GET /api/admin/bundles ────────────────────────────────────────────────────
router.get('/bundles', requireAdmin, async (req, res) => {
  try {
    const [rows] = await req.db.execute(
      'SELECT * FROM credit_bundles ORDER BY price_paise ASC'
    );
    return res.json({ status: 'success', bundles: rows });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// ── POST /api/admin/bundles ───────────────────────────────────────────────────
router.post('/bundles', requireAdmin, async (req, res) => {
  const { id, name, credits, price_paise, is_active } = req.body || {};
  if (!name || !credits || !price_paise) {
    return res.status(400).json({ status: 'error', message: 'name, credits, and price_paise are required' });
  }
  try {
    if (id) {
      await req.db.execute(
        'UPDATE credit_bundles SET name=?, credits=?, price_paise=?, is_active=? WHERE id=?',
        [name, parseInt(credits), parseInt(price_paise), is_active ? 1 : 0, id]
      );
      return res.json({ status: 'success', message: 'Bundle updated.' });
    }
    await req.db.execute(
      'INSERT INTO credit_bundles (name, credits, price_paise, is_active) VALUES (?, ?, ?, 1)',
      [name, parseInt(credits), parseInt(price_paise)]
    );
    return res.json({ status: 'success', message: 'Bundle created.' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// ── DELETE /api/admin/bundles/:id ─────────────────────────────────────────────
router.delete('/bundles/:id', requireAdmin, async (req, res) => {
  try {
    await req.db.execute('DELETE FROM credit_bundles WHERE id=?', [req.params.id]);
    return res.json({ status: 'success', message: 'Bundle deleted.' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// ── GET /api/admin/coupons ────────────────────────────────────────────────────
router.get('/coupons', requireAdmin, async (req, res) => {
  try {
    const [rows] = await req.db.execute(
      'SELECT * FROM coupons ORDER BY created_at DESC'
    );
    return res.json({ status: 'success', coupons: rows });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// ── POST /api/admin/coupons ───────────────────────────────────────────────────
router.post('/coupons', requireAdmin, async (req, res) => {
  const { id, code, discount_type, discount_value, max_uses = 0, is_active = 1, expires_at } = req.body || {};
  if (!code || !discount_type || discount_value == null) {
    return res.status(400).json({ status: 'error', message: 'code, discount_type, discount_value are required' });
  }
  if (!['percentage', 'fixed'].includes(discount_type)) {
    return res.status(400).json({ status: 'error', message: 'discount_type must be "percentage" or "fixed"' });
  }
  try {
    if (id) {
      await req.db.execute(
        'UPDATE coupons SET code=?, discount_type=?, discount_value=?, max_uses=?, is_active=?, expires_at=? WHERE id=?',
        [code.toUpperCase(), discount_type, parseInt(discount_value), parseInt(max_uses), is_active ? 1 : 0, expires_at || null, id]
      );
      return res.json({ status: 'success', message: 'Coupon updated.' });
    }
    await req.db.execute(
      'INSERT INTO coupons (code, discount_type, discount_value, max_uses, is_active, expires_at) VALUES (?, ?, ?, ?, 1, ?)',
      [code.toUpperCase(), discount_type, parseInt(discount_value), parseInt(max_uses), expires_at || null]
    );
    return res.json({ status: 'success', message: 'Coupon created.' });
  } catch (err) {
    if (err.message?.includes('UNIQUE') || err.message?.includes('Duplicate')) {
      return res.status(409).json({ status: 'error', message: 'Coupon code already exists.' });
    }
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// ── DELETE /api/admin/coupons/:id ─────────────────────────────────────────────
router.delete('/coupons/:id', requireAdmin, async (req, res) => {
  try {
    await req.db.execute('DELETE FROM coupons WHERE id=?', [req.params.id]);
    return res.json({ status: 'success', message: 'Coupon deleted.' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// ── POST /api/admin/grant-credits — manually add/adjust credits for a member ──
router.post('/grant-credits', requireAdmin, async (req, res) => {
  const { member_id, amount, note } = req.body || {};
  if (!member_id || amount == null) {
    return res.status(400).json({ status: 'error', message: 'member_id and amount are required' });
  }
  const credits = parseInt(amount);
  if (isNaN(credits) || credits === 0) {
    return res.status(400).json({ status: 'error', message: 'amount must be a non-zero integer' });
  }
  try {
    const db = req.db;
    const [memberRows] = await db.execute('SELECT id, name, email FROM members WHERE id = ? LIMIT 1', [member_id]);
    if (!memberRows.length) {
      return res.status(404).json({ status: 'error', message: 'Member not found' });
    }
    const [rows] = await db.execute('SELECT id, balance FROM member_credits WHERE member_id = ? LIMIT 1', [member_id]);
    if (rows.length) {
      await db.execute(
        'UPDATE member_credits SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE member_id = ?',
        [credits, member_id]
      );
    } else {
      if (credits < 0) {
        return res.status(400).json({ status: 'error', message: 'Cannot deduct credits from a member with no balance' });
      }
      await db.execute('INSERT INTO member_credits (member_id, balance) VALUES (?, ?)', [member_id, credits]);
    }
    const txNote = note || (credits > 0 ? `Admin granted ${credits} credits` : `Admin deducted ${Math.abs(credits)} credits`);
    await db.execute(
      "INSERT INTO credit_transactions (member_id, type, credits_delta, amount_paise, note) VALUES (?, 'admin_adjustment', ?, 0, ?)",
      [member_id, credits, txNote]
    );
    const [balRows] = await db.execute('SELECT balance FROM member_credits WHERE member_id = ? LIMIT 1', [member_id]);
    const newBalance = balRows[0]?.balance ?? 0;
    return res.json({ status: 'success', message: `Credits updated. New balance: ${newBalance}`, new_balance: newBalance });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// ── GET /api/admin/member-credits/:id — get a specific member's balance ────────
router.get('/member-credits/:id', requireAdmin, async (req, res) => {
  try {
    const [rows] = await req.db.execute(
      'SELECT balance FROM member_credits WHERE member_id = ? LIMIT 1',
      [req.params.id]
    );
    return res.json({ status: 'success', balance: rows[0]?.balance ?? 0 });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// ── GET /api/admin/credit-stats ───────────────────────────────────────────────
router.get('/credit-stats', requireAdmin, async (req, res) => {
  try {
    const [totalCredits] = await req.db.execute('SELECT COALESCE(SUM(balance),0) as total FROM member_credits');
    const [totalUnlocks] = await req.db.execute('SELECT COUNT(*) as total FROM member_blog_unlocks');
    const [totalPurchases] = await req.db.execute("SELECT COUNT(*) as total, COALESCE(SUM(amount_paise),0) as revenue FROM credit_transactions WHERE type='purchase'");
    return res.json({
      status: 'success',
      stats: {
        total_credits_outstanding: totalCredits[0]?.total || 0,
        total_blog_unlocks: totalUnlocks[0]?.total || 0,
        total_purchases: totalPurchases[0]?.total || 0,
        total_revenue_paise: totalPurchases[0]?.revenue || 0,
      }
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
