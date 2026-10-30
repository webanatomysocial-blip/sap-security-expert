const crypto = require('crypto');
const Razorpay = require('razorpay');
const { asyncHandler } = require('../utils/asyncHandler');
const { grantBonus, getActivityCredits } = require('../services/CreditHelper');
const repo = require('../repositories/paymentsRepository');
const membersRepo = require('../repositories/membersRepository');
const zoho = require('../services/zoho');
const currency = require('../services/currency');
const MailService = require('../services/MailService');
const { isSQLite } = require('../db');
const { syncAchievementsInBackground } = require('../services/achievements');

function getRazorpay() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || '',
    key_secret: process.env.RAZORPAY_KEY_SECRET || '',
  });
}

// Finds the price an admin/contributor actually set for a downloadable file,
// by reading it back out of the blog content it's embedded in (the only
// place it's ever recorded — see findBlogsReferencingFile). Returns null if
// no published blog references this exact file, which downloadFile treats
// as "not a real download" rather than defaulting to free.
function findAuthoritativeDownloadCredits(blogRows, fileUrl) {
  const escapedUrl = fileUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tagRegex = new RegExp(`<[^>]*data-file-url=["']${escapedUrl}["'][^>]*>`, 'i');
  for (const row of blogRows) {
    for (const html of [row.content, row.draft_content]) {
      if (!html) continue;
      const tagMatch = html.match(tagRegex);
      if (!tagMatch) continue;
      const creditsMatch = tagMatch[0].match(/data-credits=["'](\d+)["']/i);
      if (creditsMatch) return parseInt(creditsMatch[1], 10);
    }
  }
  return null;
}

// GET /api/payments/detect-currency?currency=USD — detects or accepts explicit currency, returns rate
const detectCurrency = asyncHandler(async (req, res) => {
  // If caller passes ?currency=USD, use that directly (manual selector override)
  const requested = typeof req.query.currency === 'string' ? req.query.currency.toUpperCase() : null;
  if (requested && requested !== 'INR') {
    const converted = await currency.convertFromINR(100_00, requested);
    if (converted) {
      return res.json({ status: 'success', currency: requested, rate: converted.rate, decimals: converted.decimals });
    }
    return res.status(400).json({ status: 'error', message: 'Unsupported currency.' });
  }
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress;
  const detected = await currency.detectCurrencyFromIp(ip);
  if (detected) {
    const converted = await currency.convertFromINR(100_00, detected);
    if (converted) {
      return res.json({ status: 'success', currency: detected, rate: converted.rate, decimals: converted.decimals });
    }
  }
  return res.json({ status: 'success', currency: 'INR', rate: 1, decimals: 2 });
});

// GET /api/payments/bundles — public
const bundles = async (req, res) => {
  try {
    const rows = await repo.findActiveBundles(req.db);
    return res.json({ status: 'success', bundles: rows });
  } catch {
    return res.status(500).json({ status: 'error', message: 'Failed to load bundles.' });
  }
};

// GET /api/payments/membership-plans — public
const membershipPlans = asyncHandler(async (req, res) => {
  const plans = await repo.findActivePlans(req.db);
  return res.json({ status: 'success', plans });
});

// GET /api/payments/my-membership — current status + purchase history
const myMembership = asyncHandler(async (req, res) => {
  const membership = await repo.getActiveMembership(req.db, req.session.member_id);
  const history = await repo.findMembershipHistory(req.db, req.session.member_id);
  return res.json({ status: 'success', membership, history });
});

// Coupon discount is computed the same way for bundles and membership plans.
function couponDiscountPaise(coupon, pricePaise) {
  if (coupon.discount_type === 'percentage') return Math.floor(pricePaise * coupon.discount_value / 100);
  return Math.min(coupon.discount_value * 100, pricePaise);
}

const fmtEmailDate = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

// Human-readable amount actually charged for an order. Foreign orders use the
// stored foreign subunits (what Razorpay charged). If a foreign order has no
// stored foreign amount (legacy rows), fall back to the verified INR price and
// label it as INR — INR paise must never be rendered as another currency.
function formatPaidAmount(order) {
  const fmt = (units, cur, decimals) => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: cur, minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  }).format(units / 10 ** decimals);
  const cur = String(order.order_currency || 'INR').toUpperCase();
  const foreign = order.order_amount_foreign;
  if (cur !== 'INR' && foreign != null && Object.prototype.hasOwnProperty.call(currency.SUPPORTED, cur)) {
    return fmt(Number(foreign), cur, currency.SUPPORTED[cur]);
  }
  const inr = fmt(Number(order.final_price_paise), 'INR', 2);
  return cur === 'INR' ? inr : `${inr} (INR equivalent)`;
}

// Builds the confirmation email for fulfillMembership to queue inside its
// transaction (dates are only known there).
function membershipEmailBuilder(member, paymentOrder, plan) {
  if (!member?.email) return undefined;
  const siteUrl = (process.env.SITE_URL || 'http://sapsecurityexpert.com').replace(/\/$/, '');
  return ({ starts_at, expires_at }) => ({
    to: member.email,
    subject: `Your ${plan.name} membership is active — SAP Security Expert`,
    body: MailService.getInstance().render('member/membership_purchased', {
      name: member.name || 'Member',
      plan_name: plan.name,
      duration_days: plan.duration_days,
      starts_on: fmtEmailDate(starts_at),
      expires_on: fmtEmailDate(expires_at),
      amount: formatPaidAmount(paymentOrder),
      order_id: paymentOrder.razorpay_order_id,
      extended: new Date(starts_at).getTime() > Date.now() + 60_000 ? 'yes' : '',
      account_url: `${siteUrl}/member/credits`,
    }),
  });
}

// The email_queue cron only runs in production MySQL (see index.js). Elsewhere,
// deliver the just-queued row immediately so dev/staging still get the email.
const QUEUE_CRON_ACTIVE = !isSQLite && process.env.NODE_ENV === 'production';
async function deliverQueuedNow(db, key) {
  const [[row]] = await db.execute(
    "SELECT id, recipient, subject, body FROM email_queue WHERE blog_id = ? AND status = 'pending' LIMIT 1", [key]
  );
  if (!row) return;
  const ok = await MailService.getInstance().sendDirect(db, row.recipient, row.subject, row.body);
  await db.execute(
    ok ? "UPDATE email_queue SET status='sent', sent_at=CURRENT_TIMESTAMP, attempts=attempts+1 WHERE id=?"
       : 'UPDATE email_queue SET attempts=attempts+1 WHERE id=?',
    [row.id]
  );
}

// Shared by /verify and the webhook. Returns null when the order was already
// fulfilled (idempotent via UNIQUE razorpay_order_id on credit_transactions).
async function fulfillPaidOrder(db, paymentOrder, paymentId, source) {
  const orderId = paymentOrder.razorpay_order_id;
  let item; let result;
  if (paymentOrder.order_type === 'membership') {
    item = await repo.findPlanById(db, paymentOrder.plan_id);
    if (!item) return null;
    const member = await membersRepo.findMemberProfileById(db, paymentOrder.member_id);
    result = await repo.fulfillMembership(db, {
      memberId: paymentOrder.member_id, plan: item, amountPaise: paymentOrder.final_price_paise,
      orderId, paymentId, note: `Membership: ${item.name} — order ${orderId}${source}`,
      email: membershipEmailBuilder(member, paymentOrder, item),
    });
    if (!result) {
      // Already fulfilled (dup /verify or webhook retry). If a crash left the
      // order unmarked, mark it now — nothing is granted or emailed again.
      await repo.markOrderFulfilled(db, orderId, paymentId);
      return null;
    }
    result.type = 'membership';
    result.plan_name = item.name;
    if (!QUEUE_CRON_ACTIVE) {
      deliverQueuedNow(db, `membership:${orderId}`).catch((e) => console.error('[membership_email]', e.message));
    }
  } else {
    item = await repo.findBundleById(db, paymentOrder.bundle_id);
    if (!item) return null;
    const credited = await repo.addCredits(
      db, paymentOrder.member_id, item.credits, paymentOrder.final_price_paise,
      `Purchased: ${item.name} (${item.credits} credits) — order ${orderId}${source}`, orderId
    );
    if (!credited) {
      await repo.markOrderFulfilled(db, orderId, paymentId); // self-heal, see membership branch
      return null;
    }
    result = { type: 'credits', credits_added: item.credits, bundle_name: item.name };
  }

  await repo.markOrderFulfilled(db, orderId, paymentId);
  if (paymentOrder.coupon_id) await repo.incrementCouponUsage(db, paymentOrder.coupon_id);

  // Zoho Books invoice — fire-and-forget; never blocks the payment response
  const invoiceItem = paymentOrder.order_type === 'membership'
    ? { name: item.name, credits: 0, description: `${item.name} membership — ${item.duration_days} days full access` }
    : item;
  membersRepo.findMemberProfileById(db, paymentOrder.member_id).then((member) => {
    if (!member) return;
    return zoho.createAndSendInvoice({
      orderId, paymentId, member: { name: member.name, email: member.email },
      bundle: invoiceItem, amountPaise: paymentOrder.final_price_paise,
    });
  }).then((r) => {
    if (r?.invoiceId) repo.saveZohoInvoiceId(db, orderId, r.invoiceId, r.invoiceUrl);
  }).catch((err) => {
    console.error('[zoho] invoice error:', err.message);
  });

  return result;
}

// GET /api/payments/my-credits — requires member session
const myCredits = async (req, res) => {
  if (!req.session.member_logged_in) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
  try {
    const balance = await repo.getMemberBalance(req.db, req.session.member_id);
    return res.json({ status: 'success', balance });
  } catch {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch balance.' });
  }
};

// GET /api/payments/my-unlocks — member's unlocked blog slugs
const myUnlocks = async (req, res) => {
  if (!req.session.member_logged_in) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
  try {
    const rows = await repo.findMemberUnlocks(req.db, req.session.member_id);
    return res.json({ status: 'success', unlocks: rows });
  } catch {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch unlocks.' });
  }
};

// GET /api/payments/my-transactions — full credit history for the member
const myTransactions = async (req, res) => {
  if (!req.session.member_logged_in) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
  const memberId = req.session.member_id;
  try {
    const purchases = await repo.findTransactionHistory(req.db, memberId);
    const unlocks = await repo.findUnlockHistory(req.db, memberId);
    const balance = await repo.getMemberBalance(req.db, memberId);

    return res.json({
      status: 'success',
      balance,
      transactions: purchases,
      unlocks,
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch transactions.' });
  }
};

// GET /api/payments/invoice/:txId — generate invoice data for a purchase
const invoice = asyncHandler(async (req, res) => {
  if (!req.session.member_logged_in) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
  const data = await repo.findInvoiceData(req.db, req.params.txId, req.session.member_id);
  if (!data) return res.status(404).json({ status: 'error', message: 'Invoice not found' });
  return res.json({ status: 'success', invoice: data });
});

// POST /api/payments/validate-coupon
const validateCoupon = async (req, res) => {
  if (!req.session.member_logged_in) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
  const { code, bundle_id, plan_id } = req.body || {};
  if (!code) return res.status(400).json({ status: 'error', message: 'Coupon code required' });

  try {
    const coupon = await repo.findActiveCouponByCode(req.db, code);
    if (!coupon) {
      return res.status(404).json({ status: 'error', message: 'Invalid or expired coupon code.' });
    }

    const item = plan_id
      ? await repo.findActivePlanById(req.db, plan_id)
      : bundle_id ? await repo.findActiveBundleById(req.db, bundle_id) : null;
    const discountPaise = item ? couponDiscountPaise(coupon, item.price_paise) : 0;

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
};

// POST /api/payments/create-order
const createOrder = async (req, res) => {
  if (!req.session.member_logged_in) {
    return res.status(401).json({ status: 'error', message: 'Please log in to purchase credits' });
  }
  const { bundle_id, plan_id, coupon_code, preferred_currency } = req.body || {};
  if (!bundle_id && !plan_id) return res.status(400).json({ status: 'error', message: 'bundle_id or plan_id required' });
  const isMembership = !!plan_id;

  try {
    const bundle = isMembership
      ? await repo.findActivePlanById(req.db, plan_id)
      : await repo.findActiveBundleById(req.db, bundle_id);
    if (!bundle) return res.status(404).json({ status: 'error', message: isMembership ? 'Plan not found' : 'Bundle not found' });

    let finalPricePaise = bundle.price_paise;
    let couponId = null;
    let discountPaise = 0;

    if (coupon_code) {
      const coupon = await repo.findActiveCouponByCode(req.db, coupon_code);
      if (coupon) {
        couponId = coupon.id;
        discountPaise = couponDiscountPaise(coupon, bundle.price_paise);
        finalPricePaise = Math.max(bundle.price_paise - discountPaise, 100);
      }
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({ status: 'error', message: 'Payment gateway not configured.' });
    }

    // Currency conversion — always store finalPricePaise in INR server-side (authoritative)
    // but charge the Razorpay order in the user's preferred currency
    let orderAmount = finalPricePaise;
    let orderCurrency = 'INR';
    let fxRate = 1;

    if (preferred_currency && preferred_currency !== 'INR') {
      const sanitizedCurrency = typeof preferred_currency === 'string' ? preferred_currency.trim().toUpperCase() : '';
      // Validate against allowlist before attempting conversion (prevent prototype traversal)
      if (!sanitizedCurrency || !Object.prototype.hasOwnProperty.call(currency.SUPPORTED, sanitizedCurrency)) {
        return res.status(400).json({ status: 'error', message: 'Unsupported currency.' });
      }
      const converted = await currency.convertFromINR(finalPricePaise, sanitizedCurrency);
      if (!converted || converted.amount <= 0) {
        return res.status(400).json({ status: 'error', message: 'Unable to convert amount to the requested currency. Please retry or pay in INR.' });
      }
      orderAmount = converted.amount;
      orderCurrency = converted.currency;
      fxRate = converted.rate;
    }

    const rzp = getRazorpay();
    const order = await rzp.orders.create({
      amount: orderAmount,
      currency: orderCurrency,
      receipt: `${isMembership ? 'membership' : 'credits'}_${req.session.member_id}_${Date.now()}`,
      notes: {
        member_id: String(req.session.member_id),
        [isMembership ? 'plan_id' : 'bundle_id']: String(bundle.id),
      },
    });

    // Store authoritative order record server-side (always in INR paise for credit accounting)
    // Also persist the Razorpay order currency/amount for post-payment reconciliation
    await repo.insertPaymentOrder(req.db, {
      orderId: order.id, memberId: req.session.member_id,
      bundleId: isMembership ? 0 : bundle.id,
      bundleCredits: isMembership ? 0 : bundle.credits,
      bundlePricePaise: bundle.price_paise,
      couponId, finalPricePaise,
      orderCurrency, orderAmountForeign: orderAmount,
      orderType: isMembership ? 'membership' : 'credits',
      planId: isMembership ? bundle.id : null,
    });

    return res.json({
      status: 'success',
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
      bundle,
      final_price_paise: finalPricePaise,
      discount_paise: discountPaise,
      fx_rate: fxRate,
    });
  } catch (err) {
    // Razorpay SDK errors carry the reason in err.error.description, not err.message.
    const reason = err.error?.description || err.message;
    console.error('[POST /payments/create-order]', err.statusCode || '', reason);
    if (/minimum amount/i.test(reason || '')) {
      return res.status(400).json({
        status: 'error', reason: 'below_minimum',
        message: 'This amount is below the minimum our payment gateway accepts in that currency. Switched to INR — please click Pay again.',
      });
    }
    return res.status(500).json({ status: 'error', message: 'Failed to create payment order.' });
  }
};

// POST /api/payments/verify — verify payment + credit the member
const verify = async (req, res) => {
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
    const paymentOrder = await repo.findOrderByIdAndMember(req.db, razorpay_order_id, req.session.member_id);
    if (!paymentOrder) {
      return res.status(400).json({ status: 'error', message: 'Order not found or does not belong to your account.' });
    }

    if (paymentOrder.fulfilled) {
      return res.status(409).json({ status: 'error', message: 'This payment has already been processed.' });
    }

    // 3. Fulfil from the server-side record (replay-safe on razorpay_order_id)
    const result = await fulfillPaidOrder(req.db, paymentOrder, razorpay_payment_id, '');
    if (!result) {
      return res.status(409).json({ status: 'error', message: 'This payment has already been processed.' });
    }

    const newBalance = await repo.getMemberBalance(req.db, req.session.member_id);
    if (result.type === 'membership') {
      const membership = await repo.getActiveMembership(req.db, req.session.member_id);
      return res.json({
        status: 'success', type: 'membership',
        message: `${result.plan_name} membership activated!`,
        membership, new_balance: newBalance,
      });
    }
    return res.json({
      status: 'success', type: 'credits',
      message: `${result.credits_added} credits added to your account!`,
      credits_added: result.credits_added,
      new_balance: newBalance,
      bundle_name: result.bundle_name,
    });
  } catch (err) {
    console.error('[POST /payments/verify]', err.message);
    return res.status(500).json({ status: 'error', message: 'Payment verification failed.' });
  }
};

// POST /api/payments/unlock-blog
const unlockBlog = async (req, res) => {
  if (!req.session.member_logged_in) {
    return res.status(401).json({ status: 'error', message: 'Please log in to unlock articles' });
  }
  const { blog_slug, method } = req.body || {};
  if (!blog_slug) return res.status(400).json({ status: 'error', message: 'blog_slug required' });

  const db = req.db;
  const memberId = req.session.member_id;

  try {
    // Match only on slug — never by numeric ID
    const blog = await repo.findPremiumBlogBySlug(db, blog_slug);
    if (!blog) return res.status(404).json({ status: 'error', message: 'Article not found' });
    if (!blog.is_premium) {
      return res.status(400).json({ status: 'error', message: 'This article is not a premium article.' });
    }
    const creditsNeeded = parseInt(blog.credits_required || 0) || 1;

    // Membership open: free, but access lasts only while the membership is active.
    if (method === 'membership') {
      if (!await repo.hasActiveMembership(db, memberId)) {
        return res.status(402).json({ status: 'error', message: 'You do not have an active membership.', reason: 'no_membership' });
      }
      await db.execute(
        "INSERT IGNORE INTO member_blog_unlocks (member_id, blog_slug, credits_spent, source) VALUES (?, ?, 0, 'membership')",
        [memberId, blog.slug]
      );
      const balance = await repo.getMemberBalance(db, memberId);
      return res.json({ status: 'success', message: 'Opened with your membership.', source: 'membership', new_balance: balance });
    }

    // req.db is already a dedicated per-request PoolConnection — run the
    // transaction directly on it. getConnection() is a Pool method, not a
    // PoolConnection method, so calling it here would throw in production.
    await db.beginTransaction();

    // STEP 1 — Try to insert the unlock row first.
    // INSERT IGNORE means if a UNIQUE KEY on (member_id, blog_slug) already exists
    // the insert is a no-op and affectedRows = 0.  That's our idempotency guard:
    // whichever of two concurrent requests inserts first "wins"; the second sees 0
    // rows affected and returns early without touching credits.
    const [unlockResult] = await db.execute(
      "INSERT IGNORE INTO member_blog_unlocks (member_id, blog_slug, credits_spent, source) VALUES (?, ?, ?, 'credits')",
      [memberId, blog.slug, creditsNeeded]
    );

    if (unlockResult.affectedRows === 0) {
      // Existing row: either a permanent credit unlock (done) or a membership
      // open the member now wants to keep forever. The conditional UPDATE is
      // the race guard — only one concurrent request can flip the source.
      const [upgrade] = await db.execute(
        "UPDATE member_blog_unlocks SET source = 'credits', credits_spent = ? WHERE member_id = ? AND blog_slug = ? AND source = 'membership'",
        [creditsNeeded, memberId, blog.slug]
      );
      if (upgrade.affectedRows === 0) {
        await db.rollback();
        const balance = await repo.getMemberBalance(db, memberId);
        return res.json({ status: 'success', message: 'Already unlocked.', already_unlocked: true, new_balance: balance });
      }
    }

    // STEP 2 — Deduct credits atomically; condition on sufficient balance
    const [deductResult] = await db.execute(
      'UPDATE member_credits SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE member_id = ? AND balance >= ?',
      [creditsNeeded, memberId, creditsNeeded]
    );

    if (deductResult.affectedRows === 0) {
      // Insufficient credits — roll back the unlock insert
      await db.rollback();
      const balance = await repo.getMemberBalance(db, memberId);
      return res.status(402).json({
        status: 'error',
        message: `Insufficient credits. You need ${creditsNeeded} credits but have ${balance}.`,
        balance,
        credits_needed: creditsNeeded,
      });
    }

    // STEP 3 — Record the spend transaction inside the same transaction
    await db.execute(
      "INSERT INTO credit_transactions (member_id, type, credits_delta, note) VALUES (?, 'spend', ?, ?)",
      [memberId, -creditsNeeded, `Unlocked article: ${blog_slug}`]
    );

    await db.commit();

    const newBalance = await repo.getMemberBalance(db, memberId);
    return res.json({
      status: 'success',
      message: 'Article unlocked! You now have lifetime access.',
      credits_spent: creditsNeeded,
      new_balance: newBalance,
    });
  } catch (err) {
    await db.rollback().catch(() => {});
    console.error('[POST /payments/unlock-blog]', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to unlock article.' });
  }
};

// POST /api/payments/webhook
// req.rawBody is populated by the `verify` callback on the global express.json()
// middleware in server/index.js — captures the exact bytes Razorpay signed,
// before they're parsed into req.body. Needed because re-serializing req.body
// with JSON.stringify would not byte-for-byte match Razorpay's original payload,
// which would make every signature check fail.
const webhook = async (req, res) => {
  const sig = req.headers['x-razorpay-signature'];
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !sig) return res.status(400).send('No webhook secret configured');

  const expected = crypto.createHmac('sha256', secret).update(req.rawBody || '').digest('hex');

  let sigValid = false;
  try {
    sigValid = crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sig, 'hex'));
  } catch { sigValid = false; }

  if (!sigValid) return res.status(400).send('Invalid signature');

  let event;
  try {
    event = JSON.parse(req.rawBody || '{}');
  } catch {
    return res.status(400).send('Invalid payload');
  }
  console.log('[webhook] event:', event.event);

  try {
    // Server-side reconciliation for credit-bundle purchases. This is the same
    // fulfillment path as /payments/verify (via addCredits' UNIQUE-KEY-backed
    // idempotency) — whichever of the two arrives first wins, the other is a
    // safe no-op. This exists so a payment that succeeds on Razorpay's side but
    // never reaches /verify (closed tab, dropped network, client error) still
    // gets fulfilled.
    if (event.event === 'payment.captured') {
      const payment = event.payload?.payment?.entity;
      const orderId = payment?.order_id;
      if (orderId) {
        const paymentOrder = await repo.findOrderById(req.db, orderId);
        if (paymentOrder && !paymentOrder.fulfilled) {
          // Security check: Verify paid amount and currency match the authoritative order record
          const expectedCurrency = (paymentOrder.order_currency || 'INR').toUpperCase();
          const expectedAmount = paymentOrder.order_amount_foreign != null ? paymentOrder.order_amount_foreign : paymentOrder.final_price_paise;
          const paidCurrency = (payment?.currency || '').toUpperCase();
          const paidAmount = Number(payment?.amount);

          if (paidCurrency !== expectedCurrency || paidAmount !== expectedAmount) {
            console.error(`[webhook] payment amount/currency mismatch for order ${orderId}: expected ${expectedAmount} ${expectedCurrency}, got ${paidAmount} ${paidCurrency}`);
            return res.status(200).json({ status: 'mismatch_ignored' });
          }

          await fulfillPaidOrder(req.db, paymentOrder, payment?.id, ' [webhook]');
        }
      }
    }

    // Refund reversal — idempotent via the UNIQUE KEY on razorpay_refund_id, so
    // Razorpay retrying this webhook (it does, on any non-2xx or timeout) can
    // never reverse the same refund twice. Balance is clamped at 0 in case the
    // member already spent some of the credits before the refund landed.
    if (event.event === 'refund.processed') {
      const refund = event.payload?.refund?.entity;
      const payment = event.payload?.payment?.entity;
      const orderId = payment?.order_id;
      const refundId = refund?.id;
      if (orderId && refundId) {
        const paymentOrder = await repo.findOrderById(req.db, orderId);
        if (paymentOrder?.order_type === 'membership') {
          await repo.cancelSubscriptionByOrder(req.db, orderId);
        } else if (paymentOrder) {
          // Use the price-locked snapshot captured at purchase time
          // (paymentOrder.bundle_credits), not a live lookup of the bundle's
          // current credits — the bundle may have been edited since the
          // purchase (e.g. an admin changing its credit amount), and the
          // whole point of storing bundle_credits on the order (see
          // createOrder's comment) is to make refunds immune to that.
          const creditsToReverse = paymentOrder.bundle_credits;

          await repo.reverseRefund(req.db, {
            memberId: paymentOrder.member_id,
            creditsToReverse,
            refundAmountPaise: refund.amount || 0,
            orderId,
            refundId,
          });
        }
      }
    }

    return res.json({ status: 'ok' });
  } catch (err) {
    console.error('[webhook] processing error:', err.message);
    // Still 200 the signature-valid webhook to stop Razorpay retry storms once
    // we've logged it — the underlying order/refund row remains unfulfilled/
    // unreversed and is safe to reconcile manually or via a later retry.
    return res.status(200).json({ status: 'logged', error: err.message });
  }
};

// POST /api/payments/linkedin-bonus
const linkedinBonus = asyncHandler(async (req, res) => {
  if (!req.session.member_logged_in) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  const amount = await getActivityCredits(req.db, 'linkedin_share', 5);
  const granted = await grantBonus(req.db, req.session.member_id, amount, 'LinkedIn share bonus');
  if (granted) syncAchievementsInBackground(req.db, req.session.member_id);
  if (!granted) return res.json({ status: 'already_claimed', message: 'LinkedIn bonus already credited.' });
  return res.json({ status: 'success', message: `+${amount} credits added for sharing on LinkedIn!` });
});

// POST /api/payments/complete-profile-bonus
const completeProfileBonus = asyncHandler(async (req, res) => {
  if (!req.session.member_logged_in) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  const memberId = req.session.member_id;
  // Verify profile is actually complete before granting
  const m = await repo.findMemberProfileForBonus(req.db, memberId);
  if (!m) return res.status(404).json({ status: 'error', message: 'Member not found' });
  const isComplete = m.name && m.phone && m.location && m.company_name && m.job_role && m.profile_image;
  if (!isComplete) return res.status(400).json({ status: 'error', message: 'Please complete all profile fields (name, phone, location, company, job role, profile photo) to earn this bonus.' });
  const amount = await getActivityCredits(req.db, 'complete_profile', 2);
  const granted = await grantBonus(req.db, memberId, amount, 'Complete profile bonus');
  if (granted) syncAchievementsInBackground(req.db, memberId);
  if (!granted) return res.json({ status: 'already_claimed', message: 'Profile bonus already credited.' });
  return res.json({ status: 'success', message: `+${amount} credits added for completing your profile!` });
});

// POST /api/payments/report-error
const reportError = asyncHandler(async (req, res) => {
  if (!req.session.member_logged_in) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  const { blog_slug, description } = req.body || {};
  if (!blog_slug || !description) return res.status(400).json({ status: 'error', message: 'blog_slug and description are required.' });
  const memberId = req.session.member_id;
  // Validate the slug exists to prevent credit farming with invented slugs
  if (!await repo.findApprovedBlogBySlug(req.db, blog_slug)) {
    return res.status(404).json({ status: 'error', message: 'Article not found.' });
  }
  const amount = await getActivityCredits(req.db, 'error_report', 1);
  const granted = await grantBonus(req.db, memberId, amount, `Error report: ${blog_slug}`);
  // Note: same slug = same dedup key, so one credit per unique blog error report
  return res.json({
    status: 'success',
    credited: granted,
    message: granted ? '+1 credit added for reporting an error!' : 'Thank you! Error already reported for this article.',
  });
});

// POST /api/payments/product-review-bonus
const productReviewBonus = asyncHandler(async (req, res) => {
  if (!req.session.member_logged_in) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  const { product_id } = req.body || {};
  if (!product_id) return res.status(400).json({ status: 'error', message: 'product_id is required.' });
  // Sanitise product_id — alphanumeric/hyphen only, max 100 chars
  if (typeof product_id !== 'string' || !/^[a-zA-Z0-9_\-]{1,100}$/.test(product_id)) {
    return res.status(400).json({ status: 'error', message: 'Invalid product_id.' });
  }
  const memberId = req.session.member_id;
  // Cap: max 5 unique product reviews credited per member to prevent farming
  const reviewCount = await repo.countProductReviews(req.db, memberId);
  if (reviewCount >= 5) {
    return res.json({ status: 'already_claimed', message: 'You have reached the maximum credit limit for product reviews.' });
  }
  const amount = await getActivityCredits(req.db, 'product_review', 5);
  const granted = await grantBonus(req.db, memberId, amount, `Product review: ${product_id}`);
  if (!granted) return res.json({ status: 'already_claimed', message: 'You have already earned credits for reviewing this product.' });
  return res.json({ status: 'success', message: `+${amount} credits added for submitting a product review!` });
});

const downloadFile = async (req, res) => {
  if (!req.session.member_logged_in) {
    return res.status(401).json({ status: 'error', message: 'Please log in to download files.' });
  }
  const { file_url, file_name } = req.body || {};
  const originalName = (file_name && typeof file_name === 'string') ? file_name.trim().slice(0, 500) : null;
  const validUrl = typeof file_url === 'string' &&
    (file_url.startsWith('/uploads/downloads/') || file_url.startsWith('private://'));
  if (!file_url || !validUrl) {
    return res.status(400).json({ status: 'error', message: 'Invalid file URL.' });
  }

  const db = req.db;
  const memberId = req.session.member_id;

  // Price is never trusted from the client — a member could otherwise POST
  // credits_required: 0 directly and download any paid file for free. The
  // only authoritative record of a file's price is the data-credits
  // attribute on the download block embedded in the blog content that
  // references it (set by the content author, sanitized on save).
  const referencingBlogs = await repo.findBlogsReferencingFile(db, file_url);
  const authoritativeCredits = findAuthoritativeDownloadCredits(referencingBlogs, file_url);
  if (authoritativeCredits === null) {
    return res.status(400).json({ status: 'error', message: 'This file is not available for download.' });
  }
  const creditsNeeded = Math.max(0, authoritativeCredits);

  const issueToken = () => {
    const token = crypto.randomBytes(24).toString('hex');
    if (!req.session.dl_tokens) req.session.dl_tokens = {};
    req.session.dl_tokens[token] = { url: file_url, action: 'download', expires: Date.now() + 10 * 60_000 };
    return token;
  };

  try {
    const isMember = await repo.hasActiveMembership(db, memberId);
    await db.beginTransaction();

    // Already downloaded — free re-download, unless it was a membership download
    // and the membership has since lapsed (then it's charged like a new download).
    const [[existing]] = await db.execute(
      'SELECT id, source FROM member_file_downloads WHERE member_id = ? AND file_url = ? LIMIT 1',
      [memberId, file_url]
    );
    if (existing && (existing.source !== 'membership' || isMember)) {
      await db.commit();
      return res.json({ status: 'success', download_url: file_url, token: issueToken(), already_downloaded: true });
    }

    // Active membership covers new downloads at no credit cost.
    if (!existing && isMember) {
      await db.execute(
        "INSERT INTO member_file_downloads (member_id, file_url, original_name, credits_spent, source) VALUES (?, ?, ?, 0, 'membership')",
        [memberId, file_url, originalName]
      );
      await db.commit();
      const newBalance = await repo.getMemberBalance(db, memberId);
      return res.json({ status: 'success', download_url: file_url, token: issueToken(), credits_spent: 0, via_membership: true, new_balance: newBalance });
    }

    // For paid files, verify balance BEFORE inserting the unlock row so we never
    // create an access record that we'll have to roll back.
    if (creditsNeeded > 0) {
      const [[balRow]] = await db.execute(
        'SELECT COALESCE(balance, 0) AS balance FROM member_credits WHERE member_id = ? LIMIT 1',
        [memberId]
      );
      const balance = balRow?.balance ?? 0;
      if (balance < creditsNeeded) {
        await db.commit();
        return res.status(402).json({
          status: 'error',
          message: `You need ${creditsNeeded} credit${creditsNeeded !== 1 ? 's' : ''} to download this file. Your balance: ${balance}.`,
          balance,
          credits_needed: creditsNeeded,
        });
      }
    }

    // Record the unlock (or convert a lapsed membership download to a paid one).
    if (existing) {
      await db.execute(
        "UPDATE member_file_downloads SET source = 'credits', credits_spent = ? WHERE id = ?",
        [creditsNeeded, existing.id]
      );
    } else {
      await db.execute(
        "INSERT INTO member_file_downloads (member_id, file_url, original_name, credits_spent, source) VALUES (?, ?, ?, ?, 'credits')",
        [memberId, file_url, originalName, creditsNeeded]
      );
    }

    // Deduct credits atomically (condition on balance so concurrent requests can't overdraw).
    if (creditsNeeded > 0) {
      const [deductResult] = await db.execute(
        'UPDATE member_credits SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE member_id = ? AND balance >= ?',
        [creditsNeeded, memberId, creditsNeeded]
      );
      if (deductResult.affectedRows === 0) {
        // Race condition: another request spent the credits between our check and now.
        await db.rollback();
        const [[balRow2]] = await db.execute(
          'SELECT COALESCE(balance, 0) AS balance FROM member_credits WHERE member_id = ? LIMIT 1',
          [memberId]
        );
        return res.status(402).json({
          status: 'error',
          message: `Insufficient credits. Your current balance: ${balRow2?.balance ?? 0}.`,
          balance: balRow2?.balance ?? 0,
          credits_needed: creditsNeeded,
        });
      }
      await db.execute(
        "INSERT INTO credit_transactions (member_id, type, credits_delta, note) VALUES (?, 'spend', ?, ?)",
        [memberId, -creditsNeeded, `Downloaded file: ${file_url}`]
      );
    }

    await db.commit();
    const newBalance = await repo.getMemberBalance(db, memberId);
    return res.json({ status: 'success', download_url: file_url, token: issueToken(), credits_spent: creditsNeeded, new_balance: newBalance });
  } catch (err) {
    await db.rollback().catch(() => {});
    console.error('[POST /payments/download-file]', err.message, err.stack);
    return res.status(500).json({ status: 'error', message: 'Failed to process download. Please try again.' });
  }
};

const myDownloads = async (req, res) => {
  try {
    const [rows] = await req.db.execute(
      'SELECT file_url, original_name, credits_spent, downloaded_at, source FROM member_file_downloads WHERE member_id = ? ORDER BY downloaded_at DESC',
      [req.session.member_id]
    );
    // Membership downloads stay listed but are locked once the membership lapses;
    // include the file's credit price so the member can re-unlock it permanently.
    if (rows.some((r) => r.source === 'membership') && !await repo.hasActiveMembership(req.db, req.session.member_id)) {
      for (const r of rows) {
        if (r.source !== 'membership') continue;
        r.access_expired = true;
        const blogs = await repo.findBlogsReferencingFile(req.db, r.file_url);
        r.credits_required = findAuthoritativeDownloadCredits(blogs, r.file_url);
      }
    }
    return res.json({ status: 'success', downloads: rows });
  } catch {
    return res.json({ status: 'success', downloads: [] });
  }
};

// GET /api/payments/invoice/:txId/pdf — stream the Zoho PDF for a member's purchase
const invoicePdf = asyncHandler(async (req, res) => {
  if (!req.session.member_logged_in) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
  const data = await repo.findInvoiceData(req.db, req.params.txId, req.session.member_id);
  if (!data) return res.status(404).json({ status: 'error', message: 'Invoice not found' });
  if (!data.zoho_invoice_id) return res.status(404).json({ status: 'error', message: 'No Zoho invoice for this purchase' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="invoice-${data.zoho_invoice_id}.pdf"`);
  await zoho.getInvoicePdf(data.zoho_invoice_id, res);
});

// Admin-only: test Zoho connection with a dummy invoice (never persisted)
const testZohoConnection = asyncHandler(async (req, res) => {
  const result = await zoho.createAndSendInvoice({
    orderId:     'TEST-ORDER-001',
    paymentId:   'TEST-PAY-001',
    member:      { name: req.body.name || 'Test User', email: req.body.email },
    bundle:      { name: 'Test Bundle', credits: 10 },
    amountPaise: 99900, // ₹999
  });
  return res.json({ status: result ? 'success' : 'skipped', invoice_id: result });
});

module.exports = {
  bundles, myCredits, myUnlocks, myTransactions, invoice, validateCoupon, createOrder, verify, unlockBlog, webhook,
  linkedinBonus, completeProfileBonus, reportError, productReviewBonus, downloadFile, myDownloads,
  testZohoConnection, invoicePdf, detectCurrency, membershipPlans, myMembership,
  formatPaidAmount,
};
