'use strict';
// Membership regression tests — in-memory SQLite, no network, no real DB file.
// Run: node server/tests/membership.test.js
const assert = require('assert');

const Database = require('better-sqlite3');

// Stub ../db before anything requires it, so loading controllers never opens
// the real database.sqlite or a MySQL pool.
require.cache[require.resolve('../db')] = {
  id: 'db-stub', loaded: true,
  exports: { isSQLite: true, pool: null, poolExec: null, dbMiddleware: () => {} },
};

const repo = require('../repositories/paymentsRepository');
const postsRepo = require('../repositories/postsRepository');
const creditsController = require('../controllers/admin/creditsController');
const { formatPaidAmount } = require('../controllers/paymentsController');

function createDb() {
  const raw = new Database(':memory:');
  raw.exec(`
    CREATE TABLE members (id INTEGER PRIMARY KEY, name TEXT, email TEXT);
    CREATE TABLE membership_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, price_paise INTEGER NOT NULL,
      duration_days INTEGER NOT NULL DEFAULT 30, description TEXT DEFAULT '', is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE member_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER NOT NULL, plan_id INTEGER NOT NULL,
      razorpay_order_id TEXT, razorpay_payment_id TEXT, status TEXT NOT NULL DEFAULT 'active',
      starts_at DATETIME NOT NULL, expires_at DATETIME NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE credit_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER NOT NULL, type TEXT NOT NULL,
      credits_delta INTEGER NOT NULL, amount_paise INTEGER DEFAULT 0, note TEXT DEFAULT '',
      razorpay_order_id TEXT, razorpay_refund_id TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX idx_ctx_order ON credit_transactions(razorpay_order_id) WHERE razorpay_order_id IS NOT NULL;
    CREATE TABLE payment_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT, razorpay_order_id TEXT NOT NULL UNIQUE, member_id INTEGER NOT NULL,
      bundle_id INTEGER NOT NULL DEFAULT 0, bundle_credits INTEGER NOT NULL DEFAULT 0, bundle_price_paise INTEGER NOT NULL DEFAULT 0,
      coupon_id INTEGER, final_price_paise INTEGER NOT NULL, order_currency TEXT NOT NULL DEFAULT 'INR',
      order_amount_foreign INTEGER, order_type TEXT NOT NULL DEFAULT 'credits', plan_id INTEGER,
      razorpay_payment_id TEXT, fulfilled INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE member_blog_unlocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER NOT NULL, blog_slug TEXT NOT NULL,
      credits_spent INTEGER NOT NULL DEFAULT 0, source TEXT NOT NULL DEFAULT 'credits',
      unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(member_id, blog_slug)
    );
    -- Deliberately WITHOUT a unique key, matching the real production table.
    CREATE TABLE email_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT, recipient TEXT NOT NULL, blog_id TEXT, subject TEXT, body TEXT,
      status TEXT DEFAULT 'pending', attempts INTEGER DEFAULT 0, sent_at DATETIME, created_at DATETIME
    );
    INSERT INTO members (id, name, email) VALUES (1, 'Asha', 'asha@example.invalid');
  `);
  let inTx = false;
  return {
    raw,
    async execute(sql, params = []) {
      const q = sql.replace(/\bINSERT IGNORE\b/gi, 'INSERT OR IGNORE').replace(/\bNOW\(\)/gi, "datetime('now')");
      const stmt = raw.prepare(q);
      if (/^\s*SELECT/i.test(q)) return [stmt.all(...params)];
      const info = stmt.run(...params);
      return [{ affectedRows: info.changes, insertId: info.lastInsertRowid }];
    },
    async beginTransaction() { if (!inTx) { raw.exec('BEGIN'); inTx = true; } },
    async commit() { if (inTx) { raw.exec('COMMIT'); inTx = false; } },
    async rollback() { if (inTx) { try { raw.exec('ROLLBACK'); } catch { /* noop */ } inTx = false; } },
  };
}

const callController = (fn, db, body) => new Promise((resolve) => {
  const res = { code: 200, status(c) { this.code = c; return this; }, json(j) { resolve({ code: this.code, ...j }); } };
  fn({ db, body, session: {}, query: {}, headers: {} }, res, (e) => resolve({ code: 500, err: e }));
});
const plan = (db) => db.raw.prepare('SELECT * FROM membership_plans WHERE id = 1').get();

async function run() {
  let passed = 0; let failed = 0;
  const test = async (name, fn) => {
    try { await fn(); console.log(`  PASS  ${name}`); passed++; }
    catch (err) { console.error(`  FAIL  ${name}\n        ${err.message}`); failed++; }
  };

  console.log('\nMembership tests\n');

  // ── Bug 1: partial plan updates must not flip is_active ───────────────────
  await test('Plan update: editing name/price keeps it active; explicit flags toggle it', async () => {
    const db = createDb();
    let r = await callController(creditsController.savePlan, db, { name: '1 Year', price_paise: 399900, duration_days: 365 });
    assert.strictEqual(r.code, 200, JSON.stringify(r));
    assert.strictEqual(plan(db).is_active, 1);

    r = await callController(creditsController.savePlan, db, { id: 1, name: 'Annual' });
    assert.strictEqual(r.code, 200); assert.strictEqual(plan(db).is_active, 1, 'name-only edit deactivated plan');
    assert.strictEqual(plan(db).name, 'Annual'); assert.strictEqual(plan(db).price_paise, 399900);

    r = await callController(creditsController.savePlan, db, { id: 1, price_paise: 299900 });
    assert.strictEqual(r.code, 200); assert.strictEqual(plan(db).is_active, 1, 'price-only edit deactivated plan');
    assert.strictEqual(plan(db).price_paise, 299900); assert.strictEqual(plan(db).name, 'Annual');

    r = await callController(creditsController.savePlan, db, { id: 1, is_active: false });
    assert.strictEqual(plan(db).is_active, 0, 'explicit deactivate');
    r = await callController(creditsController.savePlan, db, { id: 1, is_active: 1 });
    assert.strictEqual(plan(db).is_active, 1, 'explicit activate');
  });

  await test('Plan update: validation and unknown plan', async () => {
    const db = createDb();
    await callController(creditsController.savePlan, db, { name: 'M', price_paise: 100, duration_days: 30 });
    assert.strictEqual((await callController(creditsController.savePlan, db, { id: 999, name: 'x' })).code, 404);
    assert.strictEqual((await callController(creditsController.savePlan, db, { id: 1, price_paise: 50 })).code, 400);
    assert.strictEqual((await callController(creditsController.savePlan, db, { id: 1, is_active: 'maybe' })).code, 400);
    assert.strictEqual((await callController(creditsController.savePlan, db, { id: 1 })).code, 400, 'empty update rejected');
    assert.strictEqual((await callController(creditsController.savePlan, db, { name: 'no price' })).code, 400, 'create needs all fields');
    assert.strictEqual(plan(db).is_active, 1);
  });

  // ── Bug 2: email amount must match what was actually charged ──────────────
  await test('Email amount: INR, USD, 3-decimal, discounted, and missing foreign amount', () => {
    const inr = formatPaidAmount({ order_currency: 'INR', order_amount_foreign: 49900, final_price_paise: 49900 });
    assert.ok(inr.includes('499') && inr.includes('₹'), inr);
    const usd = formatPaidAmount({ order_currency: 'USD', order_amount_foreign: 599, final_price_paise: 49900 });
    assert.ok(usd.includes('5.99') && !usd.includes('499'), usd);
    const kwd = formatPaidAmount({ order_currency: 'KWD', order_amount_foreign: 1840, final_price_paise: 49900 });
    assert.ok(kwd.includes('1.840'), kwd);
    const discounted = formatPaidAmount({ order_currency: 'INR', order_amount_foreign: 39900, final_price_paise: 39900 });
    assert.ok(discounted.includes('399'), discounted);
    // Legacy foreign order without a stored foreign amount: never "$499.00".
    const legacy = formatPaidAmount({ order_currency: 'USD', order_amount_foreign: null, final_price_paise: 49900 });
    assert.ok(legacy.includes('₹') && legacy.includes('INR equivalent') && !legacy.includes('$'), legacy);
  });

  // ── Fulfilment idempotency + atomic email ─────────────────────────────────
  await test('Fulfilment: duplicate order is a no-op and queues exactly one email', async () => {
    const db = createDb();
    db.raw.exec("INSERT INTO membership_plans (id, name, price_paise, duration_days) VALUES (1, '1 Month', 100, 30)");
    const email = () => ({ to: 'asha@example.invalid', subject: 's', body: 'b' });
    const args = { memberId: 1, plan: plan(db), amountPaise: 100, orderId: 'order_A', note: 'n', email };
    assert.ok(await repo.fulfillMembership(db, args));
    assert.strictEqual(await repo.fulfillMembership(db, args), null, 'second fulfilment must be null');
    assert.strictEqual(db.raw.prepare('SELECT COUNT(*) c FROM member_subscriptions').get().c, 1);
    assert.strictEqual(db.raw.prepare("SELECT COUNT(*) c FROM email_queue WHERE blog_id = 'membership:order_A'").get().c, 1);
  });

  await test('Fulfilment: renewal while active starts when the current period ends', async () => {
    const db = createDb();
    db.raw.exec("INSERT INTO membership_plans (id, name, price_paise, duration_days) VALUES (1, '1 Month', 100, 30)");
    const a = await repo.fulfillMembership(db, { memberId: 1, plan: plan(db), amountPaise: 100, orderId: 'o1', note: 'n' });
    const b = await repo.fulfillMembership(db, { memberId: 1, plan: plan(db), amountPaise: 100, orderId: 'o2', note: 'n' });
    assert.strictEqual(b.starts_at, a.expires_at);
    const m = await repo.getActiveMembership(db, 1);
    assert.strictEqual(m.expires_at, b.expires_at, 'chain end reported');
  });

  // ── Access: expiry, refund, credits ───────────────────────────────────────
  await test('Access: membership opens lock after expiry/refund; credit unlocks stay', async () => {
    const db = createDb();
    db.raw.exec("INSERT INTO membership_plans (id, name, price_paise, duration_days) VALUES (1, '1 Month', 100, 30)");
    await repo.fulfillMembership(db, { memberId: 1, plan: plan(db), amountPaise: 100, orderId: 'o1', note: 'n' });
    db.raw.exec("INSERT INTO member_blog_unlocks (member_id, blog_slug, source) VALUES (1, 'via-membership', 'membership'), (1, 'via-credits', 'credits')");
    assert.strictEqual(await postsRepo.hasUnlockedBlog(db, 1, 'via-membership'), true);

    await repo.cancelSubscriptionByOrder(db, 'o1'); // refund
    assert.strictEqual(await repo.hasActiveMembership(db, 1), false);
    assert.strictEqual(await postsRepo.hasUnlockedBlog(db, 1, 'via-membership'), false, 'refund must revoke');
    assert.strictEqual(await postsRepo.hasUnlockedBlog(db, 1, 'via-credits'), true, 'credit unlock must stay');

    await repo.fulfillMembership(db, { memberId: 1, plan: plan(db), amountPaise: 100, orderId: 'o2', note: 'n' });
    db.raw.exec("UPDATE member_subscriptions SET starts_at='2020-01-01 00:00:00', expires_at='2020-02-01 00:00:00' WHERE razorpay_order_id='o2'");
    assert.strictEqual(await postsRepo.hasUnlockedBlog(db, 1, 'via-membership'), false, 'expiry must revoke');
    assert.deepStrictEqual(await postsRepo.findUnlockedSlugsForMember(db, 1), ['via-credits']);
  });

  await test('Order marking: only flips an unfulfilled order, never overwrites payment id', async () => {
    const db = createDb();
    db.raw.exec("INSERT INTO payment_orders (razorpay_order_id, member_id, final_price_paise) VALUES ('ox', 1, 100)");
    await repo.markOrderFulfilled(db, 'ox', 'pay_1');
    await repo.markOrderFulfilled(db, 'ox', 'pay_2');
    const row = db.raw.prepare("SELECT fulfilled, razorpay_payment_id p FROM payment_orders WHERE razorpay_order_id='ox'").get();
    assert.deepStrictEqual([row.fulfilled, row.p], [1, 'pay_1']);
  });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed) process.exit(1);
}

run().catch((e) => { console.error(e); process.exit(1); });

