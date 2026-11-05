// Read-only Zoho OAuth check: fetches the organisation record. Creates nothing.
// Usage (explicit, never in automated tests):  ZOHO_MODE=live node scripts/zoho-readonly-check.js
if (/[\\/]tests[\\/]/.test(process.argv.join(' '))) { console.error('refused inside tests'); process.exit(2); }
if (process.env.ZOHO_MODE !== 'live') { console.error('Set ZOHO_MODE=live explicitly to run this check.'); process.exit(2); }
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const zoho = require('../services/zoho');
zoho.readOnlyOrganisationCheck()
  .then((org) => { console.log('[zoho=LIVE] read-only connection check OK:', JSON.stringify(org)); })
  .catch((err) => { console.error('[zoho=LIVE] read-only connection check FAILED:', err.message); process.exit(1); });
