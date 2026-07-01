const router = require('express').Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { rateLimit } = require('../middleware/rateLimit');
const { grantBonus } = require('../services/CreditHelper');

function getRazorpay() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || '',
    key_secret: process.env.RAZORPAY_KEY_SECRET || '',
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getMemberBalance(db, memberId) {
  const [rows] = await db.execute(
    'SELECT balance FROM member_credits WHERE member_id = ? LIMIT 1', [memberId]
  );
  return rows.length ? rows[0].balance : 0;
}

// Returns false if orderId was already processed (replay guard).
async function addCredits(db, memberId, amount, amountPaise = 0, note = '', orderId = null) {
  if (orderId) {
    const [dup] = await db.execute(
      'SELECT id FROM credit_transactions WHERE razorpay_order_id = ? LIMIT 1', [orderId]
    );
    if (dup.length) return false; // already fulfilled — do not double-credit
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
  await db.execute(
    "INSERT INTO credit_transactions (member_id, type, credits_delta, amount_paise, note, razorpay_order_id) VALUES (?, 'purchase', ?, ?, ?, ?)",
    [memberId, amount, amountPaise, note, orderId || null]
  );
  return true;
}

// ── GET /api/payments/bundles — public ───────────────────────────────────────
router.get('/bundles', async (req, res) => {
  try {
    const [rows] = await req.db.execute(
      'SELECT id, name, credits, price_paise FROM credit_bundles WHERE is_active = 1 ORDER BY price_paise ASC'
    );
    return res.json({ status: 'success', bundles: rows });
  } catch {
    return res.status(500).json({ status: 'error', message: 'Failed to load bundles.' });
  }
});

// ── GET /api/payments/my-credits — requires member session ───────────────────
router.get('/my-credits', async (req, res) => {
  if (!req.session.member_logged_in) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
  try {
    const balance = await getMemberBalance(req.db, req.session.member_id);
    return res.json({ status: 'success', balance });
  } catch {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch balance.' });
  }
});

// ── GET /api/payments/my-unlocks — member's unlocked blog slugs ───────────────
router.get('/my-unlocks', async (req, res) => {
  if (!req.session.member_logged_in) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
  try {
    const [rows] = await req.db.execute(
      'SELECT blog_slug, credits_spent, unlocked_at FROM member_blog_unlocks WHERE member_id = ? ORDER BY unlocked_at DESC',
      [req.session.member_id]
    );
    return res.json({ status: 'success', unlocks: rows });
  } catch {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch unlocks.' });
  }
});

// ── GET /api/payments/my-transactions — full credit history for the member ───
router.get('/my-transactions', async (req, res) => {
  if (!req.session.member_logged_in) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
  const memberId = req.session.member_id;
  try {
    const [purchases] = await req.db.execute(
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

    const [unlocks] = await req.db.execute(
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

    const [creditRow] = await req.db.execute(
      'SELECT balance FROM member_credits WHERE member_id = ? LIMIT 1',
      [memberId]
    );

    return res.json({
      status: 'success',
      balance: creditRow[0]?.balance || 0,
      transactions: purchases,
      unlocks,
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch transactions.' });
  }
});

// ── GET /api/payments/invoice/:txId — generate invoice data for a purchase ───
router.get('/invoice/:txId', async (req, res) => {
  if (!req.session.member_logged_in) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
  try {
    const [rows] = await req.db.execute(
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
      [req.params.txId, req.session.member_id]
    );
    if (!rows.length) return res.status(404).json({ status: 'error', message: 'Invoice not found' });
    return res.json({ status: 'success', invoice: rows[0] });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// ── POST /api/payments/validate-coupon ────────────────────────────────────────
router.post('/validate-coupon', rateLimit('coupon_validate', 20, 60), async (req, res) => {
  if (!req.session.member_logged_in) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
  const { code, bundle_id } = req.body || {};
  if (!code) return res.status(400).json({ status: 'error', message: 'Coupon code required' });

  try {
    const [rows] = await req.db.execute(
      `SELECT * FROM coupons WHERE UPPER(code) = UPPER(?) AND is_active = 1
       AND (expires_at IS NULL OR expires_at > NOW())
       AND (max_uses = 0 OR used_count < max_uses)
       LIMIT 1`,
      [code]
    );
    if (!rows.length) {
      return res.status(404).json({ status: 'error', message: 'Invalid or expired coupon code.' });
    }
    const coupon = rows[0];

    let bundle = null;
    if (bundle_id) {
      const [bRows] = await req.db.execute('SELECT * FROM credit_bundles WHERE id = ? AND is_active = 1 LIMIT 1', [bundle_id]);
      bundle = bRows[0] || null;
    }

    let discountPaise = 0;
    if (bundle) {
      if (coupon.discount_type === 'percentage') {
        discountPaise = Math.floor(bundle.price_paise * coupon.discount_value / 100);
      } else {
        discountPaise = Math.min(coupon.discount_value * 100, bundle.price_paise);
      }
    }

    // Return only what the client needs to display — never expose raw discount_value
    return res.json({
      status: 'success',
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_paise: discountPaise,
      }
    });
  } catch {
    return res.status(500).json({ status: 'error', message: 'Failed to validate coupon.' });
  }
});

// ── POST /api/payments/create-order ──────────────────────────────────────────
router.post('/create-order', rateLimit('create_order', 10, 60), async (req, res) => {
  if (!req.session.member_logged_in) {
    return res.status(401).json({ status: 'error', message: 'Please log in to purchase credits' });
  }
  const { bundle_id, coupon_code } = req.body || {};
  if (!bundle_id) return res.status(400).json({ status: 'error', message: 'bundle_id required' });

  try {
    const [bundles] = await req.db.execute(
      'SELECT * FROM credit_bundles WHERE id = ? AND is_active = 1 LIMIT 1', [bundle_id]
    );
    if (!bundles.length) return res.status(404).json({ status: 'error', message: 'Bundle not found' });
    const bundle = bundles[0];

    let finalPricePaise = bundle.price_paise;
    let couponId = null;
    let discountPaise = 0;

    if (coupon_code) {
      const [cRows] = await req.db.execute(
        `SELECT * FROM coupons WHERE UPPER(code) = UPPER(?) AND is_active = 1
         AND (expires_at IS NULL OR expires_at > NOW())
         AND (max_uses = 0 OR used_count < max_uses)
         LIMIT 1`,
        [coupon_code]
      );
      if (cRows.length) {
        const coupon = cRows[0];
        couponId = coupon.id;
        if (coupon.discount_type === 'percentage') {
          discountPaise = Math.floor(bundle.price_paise * coupon.discount_value / 100);
        } else {
          discountPaise = Math.min(coupon.discount_value * 100, bundle.price_paise);
        }
        finalPricePaise = Math.max(bundle.price_paise - discountPaise, 100);
      }
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({ status: 'error', message: 'Payment gateway not configured.' });
    }

    const rzp = getRazorpay();
    const order = await rzp.orders.create({
      amount: finalPricePaise,
      currency: 'INR',
      receipt: `credits_${req.session.member_id}_${Date.now()}`,
      notes: {
        member_id: String(req.session.member_id),
        bundle_id: String(bundle.id),
      },
    });

    // Store authoritative order record server-side — used in /verify to prevent bundle swapping
    await req.db.execute(
      `INSERT INTO payment_orders (razorpay_order_id, member_id, bundle_id, bundle_credits, bundle_price_paise, coupon_id, final_price_paise)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [order.id, req.session.member_id, bundle.id, bundle.credits, bundle.price_paise, couponId, finalPricePaise]
    );

    return res.json({
      status: 'success',
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
      bundle,
      final_price_paise: finalPricePaise,
      discount_paise: discountPaise,
    });
  } catch (err) {
    console.error('[POST /payments/create-order]', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to create payment order.' });
  }
});

// ── POST /api/payments/verify — verify payment + credit the member ────────────
router.post('/verify', async (req, res) => {
  if (!req.session.member_logged_in) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ status: 'error', message: 'Missing payment fields' });
  }

  try {
    // 1. Verify HMAC signature (timing-safe comparison)
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    let sigValid = false;
    try {
      sigValid = crypto.timingSafeEqual(
        Buffer.from(expectedSig, 'hex'),
        Buffer.from(razorpay_signature, 'hex')
      );
    } catch { sigValid = false; }

    if (!sigValid) {
      return res.status(400).json({ status: 'error', message: 'Payment verification failed.' });
    }

    // 2. Look up the server-side order record — never trust bundle_id from the client
    const [orderRec] = await req.db.execute(
      'SELECT * FROM payment_orders WHERE razorpay_order_id = ? AND member_id = ? LIMIT 1',
      [razorpay_order_id, req.session.member_id]
    );
    if (!orderRec.length) {
      return res.status(400).json({ status: 'error', message: 'Order not found or does not belong to your account.' });
    }
    const paymentOrder = orderRec[0];

    if (paymentOrder.fulfilled) {
      return res.status(409).json({ status: 'error', message: 'This payment has already been processed.' });
    }

    // 3. Get authoritative bundle details from DB
    const [bundles] = await req.db.execute('SELECT * FROM credit_bundles WHERE id = ? LIMIT 1', [paymentOrder.bundle_id]);
    if (!bundles.length) return res.status(404).json({ status: 'error', message: 'Bundle not found' });
    const bundle = bundles[0];

    // 4. Add credits (replay-safe — checks razorpay_order_id uniqueness)
    const note = `Purchased: ${bundle.name} (${bundle.credits} credits) — order ${razorpay_order_id}`;
    const credited = await addCredits(
      req.db, req.session.member_id,
      bundle.credits, paymentOrder.final_price_paise,
      note, razorpay_order_id
    );

    if (!credited) {
      return res.status(409).json({ status: 'error', message: 'This payment has already been processed.' });
    }

    // 5. Mark order as fulfilled and increment coupon usage (from server-side record, not req.body)
    await req.db.execute('UPDATE payment_orders SET fulfilled = 1 WHERE razorpay_order_id = ?', [razorpay_order_id]);
    if (paymentOrder.coupon_id) {
      await req.db.execute('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?', [paymentOrder.coupon_id]).catch(() => {});
    }

    const newBalance = await getMemberBalance(req.db, req.session.member_id);

    return res.json({
      status: 'success',
      message: `${bundle.credits} credits added to your account!`,
      credits_added: bundle.credits,
      new_balance: newBalance,
      bundle_name: bundle.name,
    });
  } catch (err) {
    console.error('[POST /payments/verify]', err.message);
    return res.status(500).json({ status: 'error', message: 'Payment verification failed.' });
  }
});

// ── POST /api/payments/unlock-blog ────────────────────────────────────────────
router.post('/unlock-blog', rateLimit('unlock_blog', 20, 60), async (req, res) => {
  if (!req.session.member_logged_in) {
    return res.status(401).json({ status: 'error', message: 'Please log in to unlock articles' });
  }
  const { blog_slug } = req.body || {};
  if (!blog_slug) return res.status(400).json({ status: 'error', message: 'blog_slug required' });

  try {
    // Check already unlocked
    const [existingUnlock] = await req.db.execute(
      'SELECT id FROM member_blog_unlocks WHERE member_id = ? AND blog_slug = ? LIMIT 1',
      [req.session.member_id, blog_slug]
    );
    if (existingUnlock.length) {
      return res.json({ status: 'success', message: 'Already unlocked.', already_unlocked: true });
    }

    // Match only on slug — never by numeric ID
    const [blogRows] = await req.db.execute(
      "SELECT slug, credits_required, is_premium FROM blogs WHERE slug = ? AND status IN ('approved','published') LIMIT 1",
      [blog_slug]
    );
    if (!blogRows.length) return res.status(404).json({ status: 'error', message: 'Article not found' });
    const blog = blogRows[0];
    if (!blog.is_premium) {
      return res.status(400).json({ status: 'error', message: 'This article is not a premium article.' });
    }
    const creditsNeeded = parseInt(blog.credits_required || 0) || 1;

    // Check member balance
    const balance = await getMemberBalance(req.db, req.session.member_id);
    if (balance < creditsNeeded) {
      return res.status(402).json({
        status: 'error',
        message: `Insufficient credits. You need ${creditsNeeded} credits but have ${balance}.`,
        balance,
        credits_needed: creditsNeeded,
      });
    }

    // Deduct credits and record unlock atomically
    await req.db.execute(
      'UPDATE member_credits SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE member_id = ? AND balance >= ?',
      [creditsNeeded, req.session.member_id, creditsNeeded]
    );
    // Verify deduction actually happened (guards against concurrent unlocks)
    const newBalance = await getMemberBalance(req.db, req.session.member_id);
    if (newBalance > balance - creditsNeeded + 1) {
      return res.status(402).json({ status: 'error', message: 'Insufficient credits.' });
    }

    await req.db.execute(
      "INSERT INTO credit_transactions (member_id, type, credits_delta, note) VALUES (?, 'spend', ?, ?)",
      [req.session.member_id, -creditsNeeded, `Unlocked article: ${blog_slug}`]
    );
    await req.db.execute(
      'INSERT IGNORE INTO member_blog_unlocks (member_id, blog_slug, credits_spent) VALUES (?, ?, ?)',
      [req.session.member_id, blog.slug, creditsNeeded]
    );

    return res.json({
      status: 'success',
      message: 'Article unlocked! You now have lifetime access.',
      credits_spent: creditsNeeded,
      new_balance: newBalance,
    });
  } catch (err) {
    console.error('[POST /payments/unlock-blog]', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to unlock article.' });
  }
});

// ── POST /api/payments/webhook ────────────────────────────────────────────────
router.post('/webhook', express_raw_body, async (req, res) => {
  const sig = req.headers['x-razorpay-signature'];
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !sig) return res.status(400).send('No webhook secret configured');

  const expected = crypto.createHmac('sha256', secret).update(req.rawBody || '').digest('hex');

  let sigValid = false;
  try {
    sigValid = crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sig, 'hex'));
  } catch { sigValid = false; }

  if (!sigValid) return res.status(400).send('Invalid signature');

  try {
    const event = JSON.parse(req.rawBody || '{}');
    console.log('[webhook] event:', event.event);
    return res.json({ status: 'ok' });
  } catch {
    return res.status(500).send('Error');
  }
});

// ── POST /api/payments/linkedin-bonus ────────────────────────────────────────
router.post('/linkedin-bonus', async (req, res) => {
  if (!req.session.member_logged_in) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  try {
    const granted = await grantBonus(req.db, req.session.member_id, 5, 'LinkedIn share bonus');
    if (!granted) return res.json({ status: 'already_claimed', message: 'LinkedIn bonus already credited.' });
    return res.json({ status: 'success', message: '+5 credits added for sharing on LinkedIn!' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// ── POST /api/payments/complete-profile-bonus ─────────────────────────────────
router.post('/complete-profile-bonus', async (req, res) => {
  if (!req.session.member_logged_in) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  try {
    const memberId = req.session.member_id;
    // Verify profile is actually complete before granting
    const [rows] = await req.db.execute(
      'SELECT name, phone, location, company_name, job_role, profile_image FROM members WHERE id=? LIMIT 1', [memberId]
    );
    if (!rows.length) return res.status(404).json({ status: 'error', message: 'Member not found' });
    const m = rows[0];
    const isComplete = m.name && m.phone && m.location && m.company_name && m.job_role && m.profile_image;
    if (!isComplete) return res.status(400).json({ status: 'error', message: 'Please complete all profile fields (name, phone, location, company, job role, profile photo) to earn this bonus.' });
    const granted = await grantBonus(req.db, memberId, 2, 'Complete profile bonus');
    if (!granted) return res.json({ status: 'already_claimed', message: 'Profile bonus already credited.' });
    return res.json({ status: 'success', message: '+2 credits added for completing your profile!' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// ── POST /api/payments/report-error ──────────────────────────────────────────
router.post('/report-error', rateLimit('report_error', 5, 3600), async (req, res) => {
  if (!req.session.member_logged_in) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  const { blog_slug, description } = req.body || {};
  if (!blog_slug || !description) return res.status(400).json({ status: 'error', message: 'blog_slug and description are required.' });
  try {
    // Store the error report (simple log in credit_transactions note is enough; could also have a dedicated table)
    const memberId = req.session.member_id;
    const granted = await grantBonus(req.db, memberId, 1, `Error report: ${blog_slug}`);
    // Note: same slug = same dedup key, so one credit per unique blog error report
    return res.json({
      status: 'success',
      credited: granted,
      message: granted ? '+1 credit added for reporting an error!' : 'Thank you! Error already reported for this article.',
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// ── POST /api/payments/product-review-bonus ───────────────────────────────────
router.post('/product-review-bonus', rateLimit('product_review', 10, 3600), async (req, res) => {
  if (!req.session.member_logged_in) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  const { product_id } = req.body || {};
  if (!product_id) return res.status(400).json({ status: 'error', message: 'product_id is required.' });
  try {
    const granted = await grantBonus(req.db, req.session.member_id, 5, `Product review: ${product_id}`);
    if (!granted) return res.json({ status: 'already_claimed', message: 'You have already earned credits for reviewing this product.' });
    return res.json({ status: 'success', message: '+5 credits added for submitting a product review!' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

function express_raw_body(req, _res, next) {
  let data = '';
  req.setEncoding('utf8');
  req.on('data', chunk => { data += chunk; });
  req.on('end', () => { req.rawBody = data; next(); });
}

module.exports = router;
