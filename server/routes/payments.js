const router = require('express').Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');

function getRazorpay() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || '',
    key_secret: process.env.RAZORPAY_KEY_SECRET || '',
  });
}

// GET /api/payments/plans — public
router.get('/plans', async (req, res) => {
  try {
    const [rows] = await req.db.execute(
      'SELECT id, name, price_paise, duration_days, description FROM membership_plans WHERE is_active = 1 ORDER BY price_paise ASC'
    );
    return res.json({ status: 'success', plans: rows });
  } catch (err) {
    console.error('[GET /payments/plans]', err.message);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// GET /api/payments/my-subscription — requires member session
router.get('/my-subscription', async (req, res) => {
  if (!req.session.member_logged_in) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
  try {
    const [rows] = await req.db.execute(
      `SELECT s.id, s.status, s.starts_at, s.expires_at,
              p.name as plan_name, p.price_paise, p.duration_days
       FROM member_subscriptions s
       JOIN membership_plans p ON p.id = s.plan_id
       WHERE s.member_id = ? AND s.status = 'active' AND s.expires_at > NOW()
       ORDER BY s.expires_at DESC LIMIT 1`,
      [req.session.member_id]
    );
    return res.json({ status: 'success', subscription: rows[0] || null });
  } catch (err) {
    console.error('[GET /payments/my-subscription]', err.message);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/payments/create-order — requires member session
router.post('/create-order', async (req, res) => {
  if (!req.session.member_logged_in) {
    return res.status(401).json({ status: 'error', message: 'Please log in to subscribe' });
  }
  const { plan_id } = req.body || {};
  if (!plan_id) return res.status(400).json({ status: 'error', message: 'plan_id required' });

  try {
    const [plans] = await req.db.execute(
      'SELECT * FROM membership_plans WHERE id = ? AND is_active = 1 LIMIT 1',
      [plan_id]
    );
    if (!plans.length) return res.status(404).json({ status: 'error', message: 'Plan not found' });
    const plan = plans[0];

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({ status: 'error', message: 'Payment gateway not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to server/.env' });
    }

    const rzp = getRazorpay();
    const order = await rzp.orders.create({
      amount: plan.price_paise,
      currency: 'INR',
      receipt: `sub_${req.session.member_id}_${Date.now()}`,
      notes: {
        member_id: String(req.session.member_id),
        plan_id: String(plan.id),
        plan_name: plan.name,
      },
    });

    return res.json({
      status: 'success',
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
      plan,
    });
  } catch (err) {
    console.error('[POST /payments/create-order]', err.message);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/payments/verify — verify Razorpay signature + activate subscription
router.post('/verify', async (req, res) => {
  if (!req.session.member_logged_in) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan_id } = req.body || {};
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan_id) {
    return res.status(400).json({ status: 'error', message: 'Missing payment fields' });
  }

  try {
    // Verify HMAC-SHA256 signature
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      return res.status(400).json({ status: 'error', message: 'Payment verification failed. Invalid signature.' });
    }

    const [plans] = await req.db.execute(
      'SELECT * FROM membership_plans WHERE id = ? LIMIT 1',
      [plan_id]
    );
    if (!plans.length) return res.status(404).json({ status: 'error', message: 'Plan not found' });
    const plan = plans[0];

    // Expire any existing active subscription for this member
    await req.db.execute(
      "UPDATE member_subscriptions SET status = 'expired' WHERE member_id = ? AND status = 'active'",
      [req.session.member_id]
    );

    // Insert new subscription — expires_at = now + duration_days
    const expiresAt = new Date(Date.now() + plan.duration_days * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 19).replace('T', ' ');

    await req.db.execute(
      `INSERT INTO member_subscriptions
         (member_id, plan_id, razorpay_order_id, razorpay_payment_id, status, starts_at, expires_at)
       VALUES (?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, ?)`,
      [req.session.member_id, plan.id, razorpay_order_id, razorpay_payment_id, expiresAt]
    );

    // Store in session so posts.js can check without an extra DB query on every request
    req.session.has_premium = true;
    req.session.premium_expires_at = expiresAt;

    return res.json({
      status: 'success',
      message: 'Payment verified. Premium access activated!',
      subscription: {
        plan_name: plan.name,
        expires_at: expiresAt,
        duration_days: plan.duration_days,
      },
    });
  } catch (err) {
    console.error('[POST /payments/verify]', err.message);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/payments/webhook — Razorpay server-to-server events
router.post('/webhook', express_raw_body, async (req, res) => {
  const sig = req.headers['x-razorpay-signature'];
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !sig) return res.status(400).send('No webhook secret configured');

  const expected = crypto
    .createHmac('sha256', secret)
    .update(req.rawBody || '')
    .digest('hex');

  if (expected !== sig) return res.status(400).send('Invalid signature');

  try {
    const event = JSON.parse(req.rawBody || '{}');
    if (event.event === 'payment.failed') {
      // Mark subscription as failed if order matches
      const orderId = event.payload?.payment?.entity?.order_id;
      if (orderId) {
        await req.db.execute(
          "UPDATE member_subscriptions SET status = 'failed' WHERE razorpay_order_id = ? AND status = 'active'",
          [orderId]
        );
      }
    }
    return res.json({ status: 'ok' });
  } catch (err) {
    console.error('[webhook]', err.message);
    return res.status(500).send('Error');
  }
});

// Middleware to capture raw body for webhook signature check
function express_raw_body(req, res, next) {
  let data = '';
  req.setEncoding('utf8');
  req.on('data', chunk => { data += chunk; });
  req.on('end', () => { req.rawBody = data; next(); });
}

module.exports = router;
