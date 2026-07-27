const crypto = require('crypto');
const Razorpay = require('razorpay');
const { asyncHandler } = require('../utils/asyncHandler');
const { grantBonus, getActivityCredits } = require('../services/CreditHelper');
const repo = require('../repositories/paymentsRepository');

function getRazorpay() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || '',
    key_secret: process.env.RAZORPAY_KEY_SECRET || '',
  });
}

// GET /api/payments/bundles — public
const bundles = async (req, res) => {
  try {
    const rows = await repo.findActiveBundles(req.db);
    return res.json({ status: 'success', bundles: rows });
  } catch {
    return res.status(500).json({ status: 'error', message: 'Failed to load bundles.' });
  }
};

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
  const { code, bundle_id } = req.body || {};
  if (!code) return res.status(400).json({ status: 'error', message: 'Coupon code required' });

  try {
    const coupon = await repo.findActiveCouponByCode(req.db, code);
    if (!coupon) {
      return res.status(404).json({ status: 'error', message: 'Invalid or expired coupon code.' });
    }

    let bundle = null;
    if (bundle_id) {
      bundle = await repo.findActiveBundleById(req.db, bundle_id);
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
};

// POST /api/payments/create-order
const createOrder = async (req, res) => {
  if (!req.session.member_logged_in) {
    return res.status(401).json({ status: 'error', message: 'Please log in to purchase credits' });
  }
  const { bundle_id, coupon_code } = req.body || {};
  if (!bundle_id) return res.status(400).json({ status: 'error', message: 'bundle_id required' });

  try {
    const bundle = await repo.findActiveBundleById(req.db, bundle_id);
    if (!bundle) return res.status(404).json({ status: 'error', message: 'Bundle not found' });

    let finalPricePaise = bundle.price_paise;
    let couponId = null;
    let discountPaise = 0;

    if (coupon_code) {
      const coupon = await repo.findActiveCouponByCode(req.db, coupon_code);
      if (coupon) {
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
    await repo.insertPaymentOrder(req.db, {
      orderId: order.id, memberId: req.session.member_id, bundleId: bundle.id,
      bundleCredits: bundle.credits, bundlePricePaise: bundle.price_paise,
      couponId, finalPricePaise,
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
    });
  } catch (err) {
    console.error('[POST /payments/create-order]', err.message);
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

    // 3. Get authoritative bundle details from DB
    const bundle = await repo.findBundleById(req.db, paymentOrder.bundle_id);
    if (!bundle) return res.status(404).json({ status: 'error', message: 'Bundle not found' });

    // 4. Add credits (replay-safe — checks razorpay_order_id uniqueness)
    const note = `Purchased: ${bundle.name} (${bundle.credits} credits) — order ${razorpay_order_id}`;
    const credited = await repo.addCredits(
      req.db, req.session.member_id,
      bundle.credits, paymentOrder.final_price_paise,
      note, razorpay_order_id
    );

    if (!credited) {
      return res.status(409).json({ status: 'error', message: 'This payment has already been processed.' });
    }

    // 5. Mark order as fulfilled and increment coupon usage (from server-side record, not req.body)
    await repo.markOrderFulfilled(req.db, razorpay_order_id, razorpay_payment_id);
    if (paymentOrder.coupon_id) {
      await repo.incrementCouponUsage(req.db, paymentOrder.coupon_id);
    }

    const newBalance = await repo.getMemberBalance(req.db, req.session.member_id);

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
};

// POST /api/payments/unlock-blog
const unlockBlog = async (req, res) => {
  if (!req.session.member_logged_in) {
    return res.status(401).json({ status: 'error', message: 'Please log in to unlock articles' });
  }
  const { blog_slug } = req.body || {};
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
      'INSERT IGNORE INTO member_blog_unlocks (member_id, blog_slug, credits_spent) VALUES (?, ?, ?)',
      [memberId, blog.slug, creditsNeeded]
    );

    if (unlockResult.affectedRows === 0) {
      // Already unlocked (either pre-existing or a concurrent request beat us)
      await db.rollback();
      const balance = await repo.getMemberBalance(db, memberId);
      return res.json({ status: 'success', message: 'Already unlocked.', already_unlocked: true, new_balance: balance });
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
          const bundle = await repo.findBundleById(req.db, paymentOrder.bundle_id);
          if (bundle) {
            const credited = await repo.addCredits(
              req.db, paymentOrder.member_id, bundle.credits,
              paymentOrder.final_price_paise,
              `Purchased: ${bundle.name} (${bundle.credits} credits) — order ${orderId} [webhook]`,
              orderId
            );
            if (credited) {
              await repo.markOrderFulfilled(req.db, orderId, payment?.id);
              if (paymentOrder.coupon_id) {
                await repo.incrementCouponUsage(req.db, paymentOrder.coupon_id);
              }
            }
          }
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
        if (paymentOrder) {
          const bundle = await repo.findBundleById(req.db, paymentOrder.bundle_id);
          const creditsToReverse = bundle ? bundle.credits : paymentOrder.bundle_credits;

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
  const { file_url, credits_required, file_name } = req.body || {};
  const originalName = (file_name && typeof file_name === 'string') ? file_name.trim().slice(0, 500) : null;
  if (!file_url || typeof file_url !== 'string' || !file_url.startsWith('/uploads/downloads/')) {
    return res.status(400).json({ status: 'error', message: 'Invalid file URL.' });
  }

  const creditsNeeded = Math.max(0, parseInt(credits_required) || 0);
  const db = req.db;
  const memberId = req.session.member_id;

  try {
    await db.beginTransaction();

    // Check if already downloaded — issue free re-download token immediately.
    const [[existing]] = await db.execute(
      'SELECT id FROM member_file_downloads WHERE member_id = ? AND file_url = ? LIMIT 1',
      [memberId, file_url]
    );
    if (existing) {
      await db.commit();
      const token = require('crypto').randomBytes(24).toString('hex');
      if (!req.session.dl_tokens) req.session.dl_tokens = {};
      req.session.dl_tokens[token] = { url: file_url, expires: Date.now() + 60_000 };
      return res.json({ status: 'success', download_url: file_url, token, already_downloaded: true });
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

    // Record the unlock.
    await db.execute(
      'INSERT INTO member_file_downloads (member_id, file_url, original_name, credits_spent) VALUES (?, ?, ?, ?)',
      [memberId, file_url, originalName, creditsNeeded]
    );

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
    const token = require('crypto').randomBytes(24).toString('hex');
    if (!req.session.dl_tokens) req.session.dl_tokens = {};
    req.session.dl_tokens[token] = { url: file_url, expires: Date.now() + 60_000 };
    return res.json({ status: 'success', download_url: file_url, token, credits_spent: creditsNeeded, new_balance: newBalance });
  } catch (err) {
    await db.rollback().catch(() => {});
    console.error('[POST /payments/download-file]', err.message, err.stack);
    return res.status(500).json({ status: 'error', message: 'Failed to process download. Please try again.' });
  }
};

const myDownloads = async (req, res) => {
  try {
    const [rows] = await req.db.execute(
      'SELECT file_url, original_name, credits_spent, downloaded_at FROM member_file_downloads WHERE member_id = ? ORDER BY downloaded_at DESC',
      [req.session.member_id]
    );
    return res.json({ status: 'success', downloads: rows });
  } catch {
    return res.json({ status: 'success', downloads: [] });
  }
};

module.exports = {
  bundles, myCredits, myUnlocks, myTransactions, invoice, validateCoupon, createOrder, verify, unlockBlog, webhook,
  linkedinBonus, completeProfileBonus, reportError, productReviewBonus, downloadFile, myDownloads,
};
