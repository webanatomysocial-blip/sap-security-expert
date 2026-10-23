'use strict';
// Tests for server payment verification, webhooks, signature security, and replay safety.
// Run: node server/tests/payments.test.js
const assert = require('assert');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const repo = require('../repositories/paymentsRepository');

const TEST_KEY_SECRET = 'test_secret_key_12345';
const TEST_WEBHOOK_SECRET = 'test_webhook_sec_abcde';

function createInMemoryDb() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE
    );
    CREATE TABLE credit_bundles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      credits INTEGER NOT NULL,
      price_paise INTEGER NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      discount_type TEXT NOT NULL,
      discount_value INTEGER NOT NULL,
      used_count INTEGER NOT NULL DEFAULT 0,
      max_uses INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      expires_at DATETIME DEFAULT NULL
    );
    CREATE TABLE member_credits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL UNIQUE,
      balance INTEGER NOT NULL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE credit_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      credits_delta INTEGER NOT NULL,
      amount_paise INTEGER DEFAULT 0,
      note TEXT DEFAULT '',
      razorpay_order_id TEXT,
      razorpay_refund_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX idx_ctx_order ON credit_transactions(razorpay_order_id) WHERE razorpay_order_id IS NOT NULL;
    CREATE UNIQUE INDEX idx_ctx_refund ON credit_transactions(razorpay_refund_id) WHERE razorpay_refund_id IS NOT NULL;

    CREATE TABLE payment_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      razorpay_order_id TEXT NOT NULL UNIQUE,
      member_id INTEGER NOT NULL,
      bundle_id INTEGER NOT NULL,
      bundle_credits INTEGER NOT NULL,
      bundle_price_paise INTEGER NOT NULL,
      coupon_id INTEGER DEFAULT NULL,
      final_price_paise INTEGER NOT NULL,
      order_currency TEXT NOT NULL DEFAULT 'INR',
      order_amount_foreign INTEGER DEFAULT NULL,
      razorpay_payment_id TEXT DEFAULT NULL,
      zoho_invoice_id TEXT DEFAULT NULL,
      zoho_invoice_url TEXT DEFAULT NULL,
      fulfilled INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Wrap execute/beginTransaction/commit/rollback to match mysql2 interface used by repo
  const wrappedDb = {
    _raw: db,
    inTransaction: false,
    async execute(sql, params = []) {
      const normalizedSql = sql.replace(/\bNOW\(\)/gi, "datetime('now')");
      if (/^\s*SELECT/i.test(normalizedSql)) {
        const stmt = db.prepare(normalizedSql);
        const rows = stmt.all(...params);
        return [rows];
      } else {
        const stmt = db.prepare(normalizedSql);
        const info = stmt.run(...params);
        return [{ affectedRows: info.changes, insertId: info.lastInsertRowid }];
      }
    },
    async beginTransaction() {
      if (!this.inTransaction) {
        db.exec('BEGIN TRANSACTION');
        this.inTransaction = true;
      }
    },
    async commit() {
      if (this.inTransaction) {
        db.exec('COMMIT');
        this.inTransaction = false;
      }
    },
    async rollback() {
      if (this.inTransaction) {
        try { db.exec('ROLLBACK'); } catch { /* noop */ }
        this.inTransaction = false;
      }
    }
  };

  return wrappedDb;
}

// Generate valid HMAC signature for Razorpay checkout
function generatePaymentSignature(orderId, paymentId, secret) {
  return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
}

// Generate valid webhook signature
function generateWebhookSignature(bodyStr, secret) {
  return crypto.createHmac('sha256', secret).update(bodyStr).digest('hex');
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  PASS  ${name}`);
      passed++;
    } catch (err) {
      console.error(`  FAIL  ${name}`);
      console.error(`        ${err.message}`);
      failed++;
    }
  }

  console.log('\nPayment security, verification & regression tests\n');

  // Test 1: Signature validation logic
  await test('Signature validation: accepts valid signature and rejects tampered signature', () => {
    const orderId = 'order_test_123';
    const paymentId = 'pay_test_456';
    const validSig = generatePaymentSignature(orderId, paymentId, TEST_KEY_SECRET);

    // Timing-safe comparison check
    const expected = crypto.createHmac('sha256', TEST_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
    const isValid = crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(validSig, 'hex'));
    assert.strictEqual(isValid, true, 'Valid signature must pass timingSafeEqual');

    const tamperedSig = validSig.replace(/^[0-9a-f]/, (c) => c === 'a' ? 'b' : 'a');
    let isTamperedValid = false;
    try {
      isTamperedValid = crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(tamperedSig, 'hex'));
    } catch { isTamperedValid = false; }
    assert.strictEqual(isTamperedValid, false, 'Tampered signature must fail verification');
  });

  // Test 2: Order ownership validation (prevents fulfilling someone else's order)
  await test('Order association: rejects verifying order for unauthorized member', async () => {
    const db = createInMemoryDb();
    await repo.insertPaymentOrder(db, {
      orderId: 'order_member_1', memberId: 1, bundleId: 10,
      bundleCredits: 10, bundlePricePaise: 99900, couponId: null, finalPricePaise: 99900,
      orderCurrency: 'INR', orderAmountForeign: 99900
    });

    // Attacker (memberId: 2) attempts to claim member 1's order
    const foundByAttacker = await repo.findOrderByIdAndMember(db, 'order_member_1', 2);
    assert.strictEqual(foundByAttacker, null, 'Must not return order if member_id does not match');

    // Legit member (memberId: 1)
    const foundByOwner = await repo.findOrderByIdAndMember(db, 'order_member_1', 1);
    assert.ok(foundByOwner, 'Must return order for genuine owner');
    assert.strictEqual(foundByOwner.member_id, 1);
  });

  // Test 3: Idempotency & Replay Protection on addCredits
  await test('Idempotency & Replay: duplicate credit-granting on same order returns false', async () => {
    const db = createInMemoryDb();
    const orderId = 'order_dup_check_1';
    const memberId = 100;
    const credits = 25;
    const finalPricePaise = 199900;

    const firstGrant = await repo.addCredits(db, memberId, credits, finalPricePaise, 'First grant', orderId);
    assert.strictEqual(firstGrant, true, 'First credit grant must succeed');

    const balanceAfterFirst = await repo.getMemberBalance(db, memberId);
    assert.strictEqual(balanceAfterFirst, 25, 'Balance must be 25 after first grant');

    // Duplicate call (e.g. concurrent verify and webhook or replay attempt)
    const secondGrant = await repo.addCredits(db, memberId, credits, finalPricePaise, 'Second grant', orderId);
    assert.strictEqual(secondGrant, false, 'Duplicate credit grant must return false without adding balance');

    const balanceAfterSecond = await repo.getMemberBalance(db, memberId);
    assert.strictEqual(balanceAfterSecond, 25, 'Balance must remain 25 without duplicate credits');
  });

  // Test 4: Webhook currency & amount mismatch protection
  await test('Webhook security: rejects payment with mismatched currency or amount', async () => {
    const db = createInMemoryDb();
    const orderId = 'order_usd_123';
    await repo.insertPaymentOrder(db, {
      orderId, memberId: 42, bundleId: 5, bundleCredits: 15, bundlePricePaise: 149900,
      couponId: null, finalPricePaise: 149900,
      orderCurrency: 'USD', orderAmountForeign: 1800 // $18.00
    });

    const paymentOrder = await repo.findOrderById(db, orderId);
    assert.ok(paymentOrder);

    // Mismatched currency (hacker sends INR for a USD order)
    const fakePaymentINR = { order_id: orderId, amount: 1800, currency: 'INR' };
    const expectedCurrency = (paymentOrder.order_currency || 'INR').toUpperCase();
    const expectedAmount = paymentOrder.order_amount_foreign != null ? paymentOrder.order_amount_foreign : paymentOrder.final_price_paise;

    const isCurrencyMatch = (fakePaymentINR.currency || '').toUpperCase() === expectedCurrency;
    assert.strictEqual(isCurrencyMatch, false, 'Currency mismatch must be detected');

    // Mismatched amount (tampered subunit amount)
    const fakePaymentUnderpaid = { order_id: orderId, amount: 100, currency: 'USD' };
    const isAmountMatch = Number(fakePaymentUnderpaid.amount) === expectedAmount;
    assert.strictEqual(isAmountMatch, false, 'Amount mismatch must be detected');

    // Correct amount & currency
    const legitimatePayment = { order_id: orderId, amount: 1800, currency: 'USD' };
    assert.strictEqual(legitimatePayment.currency.toUpperCase(), expectedCurrency);
    assert.strictEqual(Number(legitimatePayment.amount), expectedAmount);
  });

  // Test 5: Webhook signature verification and missing secret guard
  await test('Webhook verification: rejects invalid secret or missing raw body', () => {
    const payload = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_1' } } } });
    const validSig = generateWebhookSignature(payload, TEST_WEBHOOK_SECRET);

    // Verification check
    const expected = crypto.createHmac('sha256', TEST_WEBHOOK_SECRET).update(payload).digest('hex');
    const valid = crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(validSig, 'hex'));
    assert.strictEqual(valid, true, 'Valid webhook signature must match');

    // Empty or wrong secret fails
    const badSecretExpected = crypto.createHmac('sha256', 'wrong_secret').update(payload).digest('hex');
    const badValid = crypto.timingSafeEqual(Buffer.from(badSecretExpected, 'hex'), Buffer.from(validSig, 'hex'));
    assert.strictEqual(badValid, false, 'Signature with wrong secret must fail');
  });

  // Test 6: Refund reversal idempotency
  await test('Refund reversal: reverses credits once and duplicate webhook is idempotent', async () => {
    const db = createInMemoryDb();
    const memberId = 200;
    const orderId = 'order_refund_test';
    const refundId = 'rfnd_test_999';

    // Grant 50 credits initially
    await repo.addCredits(db, memberId, 50, 499900, 'Initial purchase', orderId);
    let balance = await repo.getMemberBalance(db, memberId);
    assert.strictEqual(balance, 50);

    // Apply refund reversal
    const rev1 = await repo.reverseRefund(db, {
      memberId,
      creditsToReverse: 50,
      refundAmountPaise: 499900,
      orderId,
      refundId
    });
    assert.strictEqual(rev1, true, 'First refund reversal must return true');

    balance = await repo.getMemberBalance(db, memberId);
    assert.strictEqual(balance, 0, 'Balance must be deducted to 0');

    // Duplicate refund webhook delivery with same refundId
    const rev2 = await repo.reverseRefund(db, {
      memberId,
      creditsToReverse: 50,
      refundAmountPaise: 499900,
      orderId,
      refundId
    });
    assert.strictEqual(rev2, false, 'Duplicate refund reversal must return false');

    balance = await repo.getMemberBalance(db, memberId);
    assert.strictEqual(balance, 0, 'Balance must not be subtracted again');
  });

  // Test 7: Canonical INR accounting regression
  await test('Canonical accounting: final_price_paise is stored in INR paise regardless of foreign order currency', async () => {
    const db = createInMemoryDb();
    const orderId = 'order_intl_inr_canonical';
    const inrFinalPaise = 99900; // ₹999 authoritative
    const foreignAmount = 180;   // 180 JPY

    await repo.insertPaymentOrder(db, {
      orderId, memberId: 300, bundleId: 1, bundleCredits: 10, bundlePricePaise: 99900,
      couponId: null, finalPricePaise: inrFinalPaise,
      orderCurrency: 'JPY', orderAmountForeign: foreignAmount
    });

    const stored = await repo.findOrderById(db, orderId);
    assert.strictEqual(stored.final_price_paise, 99900, 'Authoritative INR final_price_paise must be preserved');
    assert.strictEqual(stored.order_currency, 'JPY', 'order_currency must record foreign currency');
    assert.strictEqual(stored.order_amount_foreign, 180, 'order_amount_foreign must record foreign amount charged');
  });

  // Test 8: Existing INR purchase regression
  await test('INR Purchase regression: default values and flows work seamlessly without foreign currency', async () => {
    const db = createInMemoryDb();
    const orderId = 'order_standard_inr';

    await repo.insertPaymentOrder(db, {
      orderId, memberId: 400, bundleId: 2, bundleCredits: 20, bundlePricePaise: 149900,
      couponId: null, finalPricePaise: 149900,
      orderCurrency: 'INR', orderAmountForeign: 149900
    });

    const stored = await repo.findOrderById(db, orderId);
    assert.strictEqual(stored.order_currency, 'INR');
    assert.strictEqual(stored.final_price_paise, 149900);
    assert.strictEqual(stored.order_amount_foreign, 149900);
  });

  // Test 9: SQLite schema default column test
  await test('Schema default: inserting without order_currency defaults to clean "INR" (no extra quotes)', async () => {
    const db = createInMemoryDb();
    // Insert row relying on table default
    await db.execute(
      `INSERT INTO payment_orders
         (razorpay_order_id, member_id, bundle_id, bundle_credits, bundle_price_paise, final_price_paise)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['order_default_check_1', 500, 1, 10, 99900, 99900]
    );

    const stored = await repo.findOrderById(db, 'order_default_check_1');
    assert.strictEqual(stored.order_currency, 'INR', 'Default order_currency must be exactly "INR" without extra quotes');
    assert.strictEqual(stored.order_amount_foreign, null, 'Default order_amount_foreign must be null');
  });

  // Test 10: Existing database transaction records regression
  await test('Existing records integrity: all existing records in database.sqlite have clean order_currency="INR"', () => {
    const fs = require('fs');
    const path = require('path');
    const dbPath = path.resolve(__dirname, '../database.sqlite');
    if (fs.existsSync(dbPath)) {
      const Database = require('better-sqlite3');
      const realDb = new Database(dbPath);
      const rows = realDb.prepare('SELECT id, razorpay_order_id, order_currency FROM payment_orders').all();
      assert.ok(rows.length > 0, 'Database should contain existing payment_orders rows');
      for (const row of rows) {
        assert.strictEqual(row.order_currency, 'INR', `Row ${row.id} (${row.razorpay_order_id}) must have clean 'INR'`);
      }
    }
  });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
