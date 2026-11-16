// Voids ONE specified, unpaid Zoho Books test invoice.
// Required local environment values:
//   ZOHO_MODE=live
//   ZOHO_TEST_VOID_AUTHORISED=I_AUTHORISE_VOID_OF_THIS_TEST_INVOICE
//   ZOHO_TEST_INVOICE_ID=<numeric Zoho invoice ID>
// Run with: node server/scripts/zoho-void-test-invoice.js --confirm
// This command intentionally never searches for, deletes, or bulk-voids invoices.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const invoiceId = String(process.env.ZOHO_TEST_INVOICE_ID || '').trim();
const authorised = process.env.ZOHO_TEST_VOID_AUTHORISED === 'I_AUTHORISE_VOID_OF_THIS_TEST_INVOICE';
if (process.env.ZOHO_MODE !== 'live' || !authorised || !/^\d+$/.test(invoiceId)) {
  console.log('NOT RUNNING. Requires live mode, explicit void authorisation, and one numeric test invoice ID.');
  process.exit(0);
}
if (!process.argv.includes('--confirm')) {
  console.log(`Authorised but not confirmed. Would void only invoice ${invoiceId}. Add --confirm to execute.`);
  process.exit(0);
}

require('../services/zoho').voidInvoice(invoiceId)
  .then((result) => console.log('[zoho=LIVE] invoice void result:', JSON.stringify(result)))
  .catch((err) => { console.error('[zoho=LIVE] invoice void FAILED:', err.message); process.exit(1); });
