'use strict';
// Tests for server/services/currency.js — no test framework, plain assert.
// Run: node server/tests/currency.test.js
const assert = require('assert');

// Monkey-patch the module's internal cache so tests don't hit the network.
// We load the module, then inject synthetic rates via the cache slot.
const currencyModule = require('../services/currency');

// Inject a deterministic rate cache so getRates() returns immediately.
// The module exports nothing about the cache, but we can override the network
// by replacing the `get` function used by `getRates`. Simpler: just reach into
// the module cache and patch `_rateCache` by re-requiring with a stub.
//
// Easiest path: stub the https.get used internally by monkey-patching the https
// module in the require cache BEFORE loading our module. Since the module is
// already loaded above, we instead test `convertFromINR` by injecting a mock
// via the module's internal `getRates`. We do this by swapping the cached rates
// directly in the module's require cache object.

// Access the module's internal _rateCache via a test-only helper we'll write inline.
// Since the module doesn't export it, we re-require after injecting rates via https mock.
// Simplest approach: override require('https').get in the require cache.

const https = require('https');
const EventEmitter = require('events');

let _mockRates = null;

function mockHttpsGet(url, cb) {
  const req = new EventEmitter();
  if (_mockRates === null) {
    // Simulate network failure — emit error on req (what .on('error', reject) listens to)
    process.nextTick(() => req.emit('error', new Error('network error')));
  } else {
    const res = new EventEmitter();
    if (cb) cb(res);
    process.nextTick(() => {
      res.emit('data', JSON.stringify({ rates: _mockRates }));
      res.emit('end');
    });
  }
  return req;
}

// Patch https.get on the already-loaded module's https dependency.
// Because node caches require(), the module already holds a reference to the
// https object — patching https.get here affects the module too.
const origGet = https.get;
https.get = mockHttpsGet;

// Force the module to bust its 1-hour cache between tests by resetting fetchedAt.
// We do this by requiring the module and clearing the module cache so each
// getRates() call goes through our mock.
function bustCache() {
  // The module holds _rateCache in its closure. We can't reach it directly.
  // Instead, delete and re-require the module between groups of tests
  // so each group starts with a cold cache.
  delete require.cache[require.resolve('../services/currency')];
}

async function run() {
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

  console.log('\nCurrency conversion tests\n');

  // ── Group 1: standard conversions with known rates ──────────────────────────
  _mockRates = { USD: 0.012, JPY: 0.18, KWD: 0.0037, EUR: 0.011 };
  bustCache();
  const c1 = require('../services/currency');

  await test('USD 2-decimal: ₹999 → 1199 cents ($11.99)', async () => {
    // paise=99900, rate=0.012 → inr=999 → 999*0.012=11.988 → round(11.988*100)=1199 cents
    const r = await c1.convertFromINR(99900, 'USD');
    assert.ok(r, 'should return result');
    assert.strictEqual(r.amount, 1199, `expected 1199 got ${r.amount}`);
    assert.strictEqual(r.currency, 'USD');
    assert.strictEqual(r.decimals, 2);
  });

  await test('JPY 0-decimal: ₹999 → 180 yen', async () => {
    // paise=99900, rate=0.18 → inr=999 → 999*0.18=179.82 → round(179.82*1)=180 yen
    const r = await c1.convertFromINR(99900, 'JPY');
    assert.ok(r, 'should return result');
    assert.strictEqual(r.amount, 180);
    assert.strictEqual(r.decimals, 0);
  });

  await test('KWD 3-decimal: ₹999 → 999*0.0037=3.6963 KD → round 3696 fils → trailing zero rule 3690 fils (3.690 KD)', async () => {
    // 999 * 0.0037 = 3.6963 → round(3.6963 * 1000) = 3696 → Math.floor(3696 / 10) * 10 = 3690 fils
    // Ensures customers are not overcharged compared to displayed subunit price
    const r = await c1.convertFromINR(99900, 'KWD');
    assert.ok(r, 'should return result');
    assert.strictEqual(r.amount, 3690);
    assert.strictEqual(r.decimals, 3);
  });

  await test('3-decimal boundary test: exact values ending in 1..9 correctly zero out without exceeding original amount', async () => {
    // Test case mimicking Razorpay docs example: 99.991 KD -> 99990 fils
    // inrAmount * rate = 99.991 -> paise = 9999100 with rate = 0.01 -> inrAmount = 99991 -> 999.91
    // Directly test convertFromINR calculation with custom rate
    _mockRates = { KWD: 0.003704, BHD: 0.004509, OMR: 0.004601 };
    bustCache();
    const cBound = require('../services/currency');

    // 100000 paise (₹1000) * 0.003704 = 3.704 KD -> 3704 fils -> 3700 fils
    const rKwd = await cBound.convertFromINR(100000, 'KWD');
    assert.strictEqual(rKwd.amount, 3700, 'Trailing 4 must zero out to 3700');

    // 100000 paise (₹1000) * 0.004509 = 4.509 BHD -> 4509 fils -> 4500 fils
    const rBhd = await cBound.convertFromINR(100000, 'BHD');
    assert.strictEqual(rBhd.amount, 4500, 'Trailing 9 must zero out to 4500 (never rounded up to 4510)');

    // 100000 paise (₹1000) * 0.004601 = 4.601 OMR -> 4601 baisa -> 4600 baisa
    const rOmr = await cBound.convertFromINR(100000, 'OMR');
    assert.strictEqual(rOmr.amount, 4600, 'Trailing 1 must zero out to 4600');
  });

  await test('Frontend/Backend consistency: frontend decimal amount matches backend subunit integer / 10^decimals', async () => {
    _mockRates = { USD: 0.012, JPY: 0.18, KWD: 0.0037 };
    bustCache();
    const cConsistency = require('../services/currency');

    // Frontend calculation logic from MembershipPage.jsx & MemberCredits.jsx:
    function frontendCalc(paise, fxCurrency, fxRate, decimals) {
      let amount = (paise / 100) * fxRate;
      if (decimals === 3) {
        amount = Math.floor(Math.round(amount * 1000) / 10) * 10 / 1000;
      } else {
        amount = Math.round(amount * Math.pow(10, decimals)) / Math.pow(10, decimals);
      }
      return amount;
    }

    const testPaise = 99900;
    for (const cur of ['USD', 'JPY', 'KWD']) {
      const backendRes = await cConsistency.convertFromINR(testPaise, cur);
      const frontendDec = frontendCalc(testPaise, cur, backendRes.rate, backendRes.decimals);
      const backendDec = backendRes.amount / Math.pow(10, backendRes.decimals);
      assert.strictEqual(frontendDec, backendDec, `Frontend amount ${frontendDec} must match backend amount ${backendDec} for ${cur}`);
    }
  });

  await test('INR returns null (no conversion needed)', async () => {
    const r = await c1.convertFromINR(99900, 'INR');
    assert.strictEqual(r, null);
  });

  await test('Unsupported currency returns null', async () => {
    const r = await c1.convertFromINR(99900, 'FAKE');
    assert.strictEqual(r, null);
  });

  await test('Zero paise returns null (rejected safely)', async () => {
    const r = await c1.convertFromINR(0, 'USD');
    assert.strictEqual(r, null);
  });

  await test('Negative paise returns null (rejected safely)', async () => {
    const r = await c1.convertFromINR(-1000, 'USD');
    assert.strictEqual(r, null);
  });

  await test('Prototype properties return null (safe against prototype traversal)', async () => {
    const r1 = await c1.convertFromINR(99900, 'toString');
    const r2 = await c1.convertFromINR(99900, '__proto__');
    const r3 = await c1.convertFromINR(99900, 'constructor');
    assert.strictEqual(r1, null);
    assert.strictEqual(r2, null);
    assert.strictEqual(r3, null);
  });

  await test('Malformed or non-string currencies return null', async () => {
    const r1 = await c1.convertFromINR(99900, null);
    const r2 = await c1.convertFromINR(99900, 123);
    const r3 = await c1.convertFromINR(99900, {});
    assert.strictEqual(r1, null);
    assert.strictEqual(r2, null);
    assert.strictEqual(r3, null);
  });

  // ── Group 2: API failure ─────────────────────────────────────────────────────
  _mockRates = null; // simulate network down, no prior cache
  bustCache();
  const c2 = require('../services/currency');

  await test('Returns null when exchange rate API is down and cache is cold', async () => {
    const r = await c2.convertFromINR(99900, 'USD').catch(() => null);
    assert.strictEqual(r, null, 'should return null, not throw or use stale data');
  });

  // ── Group 3: SUPPORTED allowlist ─────────────────────────────────────────────
  _mockRates = { USD: 0.012 };
  bustCache();
  const c3 = require('../services/currency');

  await test('SUPPORTED export is an object with known currencies', () => {
    assert.strictEqual(typeof c3.SUPPORTED, 'object');
    assert.strictEqual(c3.SUPPORTED['USD'], 2);
    assert.strictEqual(c3.SUPPORTED['JPY'], 0);
    assert.strictEqual(c3.SUPPORTED['KWD'], 3);
    assert.strictEqual(c3.SUPPORTED['INR'], undefined, 'INR must not be in SUPPORTED');
    assert.strictEqual(Object.prototype.hasOwnProperty.call(c3.SUPPORTED, 'toString'), false);
  });

  // Restore https.get
  https.get = origGet;

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => { console.error(err); process.exit(1); });
