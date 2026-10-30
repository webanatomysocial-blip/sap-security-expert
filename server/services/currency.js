'use strict';
const https = require('https');

// Razorpay-supported international currencies with their decimal places
const SUPPORTED = {
  USD: 2, EUR: 2, GBP: 2, SGD: 2, AED: 2, CAD: 2, AUD: 2, MYR: 2,
  HKD: 2, CHF: 2, SEK: 2, NOK: 2, DKK: 2, NZD: 2, ZAR: 2, THB: 2,
  MXN: 2, QAR: 2, KWD: 3, BHD: 3, OMR: 3, JPY: 0, KRW: 0, IDR: 0,
};

// Country → currency map (common countries)
const COUNTRY_CURRENCY = {
  US: 'USD', GB: 'GBP', DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR',
  NL: 'EUR', BE: 'EUR', PT: 'EUR', AT: 'EUR', FI: 'EUR', IE: 'EUR',
  SG: 'SGD', AE: 'AED', CA: 'CAD', AU: 'AUD', MY: 'MYR', HK: 'HKD',
  CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', NZ: 'NZD', ZA: 'ZAR',
  TH: 'THB', MX: 'MXN', QA: 'QAR', KW: 'KWD', BH: 'BHD', OM: 'OMR',
  JP: 'JPY', KR: 'KRW', ID: 'IDR',
};

// Exchange rate cache (1 hour TTL)
let _rateCache = { rates: null, fetchedAt: 0 };

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(null); } });
    }).on('error', reject);
  });
}

async function getRates() {
  if (_rateCache.rates && Date.now() - _rateCache.fetchedAt < 3_600_000) {
    return _rateCache.rates;
  }
  const json = await get('https://api.exchangerate-api.com/v4/latest/INR');
  if (json?.rates) {
    _rateCache = { rates: json.rates, fetchedAt: Date.now() };
    return json.rates;
  }
  return _rateCache.rates || null; // stale fallback
}

// Detect currency from IP using ipapi.co (free tier: 1000 req/day)
async function detectCurrencyFromIp(ip) {
  try {
    const localIps = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
    if (!ip || localIps.includes(ip)) return null;
    const json = await get(`https://ipapi.co/${ip}/json/`);
    const country = json?.country_code;
    return country ? (COUNTRY_CURRENCY[country] || null) : null;
  } catch { return null; }
}

// Convert INR paise → target currency's smallest unit
// Returns { amount, currency, rate, decimals } or null if unsupported
async function convertFromINR(paise, targetCurrency) {
  if (typeof targetCurrency !== 'string') return null;
  const upperCurrency = targetCurrency.trim().toUpperCase();
  if (upperCurrency === 'INR' || !Object.prototype.hasOwnProperty.call(SUPPORTED, upperCurrency)) return null;

  const numericPaise = Number(paise);
  if (!Number.isFinite(numericPaise) || numericPaise <= 0) return null;

  const rates = await getRates();
  if (!rates) return null;
  const rate = rates[upperCurrency];
  if (!rate || typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) return null;

  const inrAmount = numericPaise / 100;
  const converted = inrAmount * rate;
  const decimals = SUPPORTED[upperCurrency];

  // Must match src/utils/fxPrice.js so the displayed price is exactly what's charged.
  let amount = Math.round(converted * Math.pow(10, decimals));
  // Razorpay rule for 3-decimal currencies (KWD, BHD, OMR): last digit must be 0.
  // Floor (never charge more than the converted price).
  if (decimals === 3) amount = Math.floor(amount / 10) * 10;
  // Tiny INR prices (e.g. ₹1 → 0.0045 BHD) must not round to zero — charge the smallest valid unit.
  amount = Math.max(amount, decimals === 3 ? 10 : 1);

  return { amount, currency: upperCurrency, rate, decimals };
}

module.exports = { detectCurrencyFromIp, convertFromINR, SUPPORTED };
