// PREPARED, NOT RUN. Creates ONE test invoice in the live Zoho org (no email is sent).
// Runs only when all of these are set explicitly:
//   ZOHO_MODE=live
//   ZOHO_TEST_INVOICE_AUTHORISED=I_AUTHORISE_ONE_TEST_INVOICE
//   TEST_CUSTOMER_EMAIL=<an address you own>
// and only with the flag --confirm. Without --confirm it prints the plan and exits.
if (/[\\/]tests[\\/]/.test(process.argv.join(' '))) { console.error('refused inside tests'); process.exit(2); }
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const need = {
  ZOHO_MODE: process.env.ZOHO_MODE === 'live',
  ZOHO_TEST_INVOICE_AUTHORISED: process.env.ZOHO_TEST_INVOICE_AUTHORISED === 'I_AUTHORISE_ONE_TEST_INVOICE',
  TEST_CUSTOMER_EMAIL: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(process.env.TEST_CUSTOMER_EMAIL || ''),
};
const missing = Object.keys(need).filter((k) => !need[k]);
const plan = { amountINR: 1, reference: `IT-TEST-${Date.now()}`, customer: process.env.TEST_CUSTOMER_EMAIL, emailSent: false };
if (missing.length) { console.log('NOT RUNNING. Missing/invalid:', missing.join(', ')); console.log('Plan if authorised:', JSON.stringify(plan)); process.exit(0); }
if (!process.argv.includes('--confirm')) { console.log('Authorised but no --confirm flag. Plan:', JSON.stringify(plan)); process.exit(0); }
const zoho = require('../services/zoho');
zoho.createTestInvoiceNoEmail({ customerEmail: plan.customer, name: 'IT Test Customer', amountINR: plan.amountINR, reference: plan.reference })
  .then((r) => console.log('[zoho=LIVE] test invoice created (not emailed):', JSON.stringify(r), '— void it in Zoho afterwards'))
  .catch((e) => { console.error('[zoho=LIVE] test invoice FAILED:', e.message); process.exit(1); });
