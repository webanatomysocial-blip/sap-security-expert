const crypto = require('crypto');
const Razorpay = require('razorpay');
const { asyncHandler } = require('../utils/asyncHandler');
const { grantBonus } = require('../services/CreditHelper');
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

  try {
    // Check already unlocked
    if (await repo.findExistingUnlock(req.db, req.session.member_id, blog_slug)) {
      return res.json({ status: 'success', message: 'Already unlocked.', already_unlocked: true });
    }

    // Match only on slug — never by numeric ID
    const blog = await repo.findPremiumBlogBySlug(req.db, blog_slug);
    if (!blog) return res.status(404).json({ status: 'error', message: 'Article not found' });
    if (!blog.is_premium) {
      return res.status(400).json({ status: 'error', message: 'This article is not a premium article.' });
    }
    const creditsNeeded = parseInt(blog.credits_required || 0) || 1;

    // Check member balance
    const balance = await repo.getMemberBalance(req.db, req.session.member_id);
    if (balance < creditsNeeded) {
      return res.status(402).json({
        status: 'error',
        message: `Insufficient credits. You need ${creditsNeeded} credits but have ${balance}.`,
        balance,
        credits_needed: creditsNeeded,
      });
    }

    // Deduct credits and record unlock atomically
    await repo.deductCreditsIfSufficient(req.db, req.session.member_id, creditsNeeded);
    // Verify deduction actually happened (guards against concurrent unlocks)
    const newBalance = await repo.getMemberBalance(req.db, req.session.member_id);
    if (newBalance > balance - creditsNeeded + 1) {
      return res.status(402).json({ status: 'error', message: 'Insufficient credits.' });
    }

    await repo.insertSpendTransaction(req.db, req.session.member_id, creditsNeeded, `Unlocked article: ${blog_slug}`);
    await repo.insertBlogUnlock(req.db, req.session.member_id, blog.slug, creditsNeeded);

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
  const granted = await grantBonus(req.db, req.session.member_id, 5, 'LinkedIn share bonus');
  if (!granted) return res.json({ status: 'already_claimed', message: 'LinkedIn bonus already credited.' });
  return res.json({ status: 'success', message: '+5 credits added for sharing on LinkedIn!' });
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
  const granted = await grantBonus(req.db, memberId, 2, 'Complete profile bonus');
  if (!granted) return res.json({ status: 'already_claimed', message: 'Profile bonus already credited.' });
  return res.json({ status: 'success', message: '+2 credits added for completing your profile!' });
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
  const granted = await grantBonus(req.db, memberId, 1, `Error report: ${blog_slug}`);
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
  const granted = await grantBonus(req.db, memberId, 5, `Product review: ${product_id}`);
  if (!granted) return res.json({ status: 'already_claimed', message: 'You have already earned credits for reviewing this product.' });
  return res.json({ status: 'success', message: '+5 credits added for submitting a product review!' });
});

module.exports = {
  bundles, myCredits, myUnlocks, myTransactions, invoice, validateCoupon, createOrder, verify, unlockBlog, webhook,
  linkedinBonus, completeProfileBonus, reportError, productReviewBonus,
};
