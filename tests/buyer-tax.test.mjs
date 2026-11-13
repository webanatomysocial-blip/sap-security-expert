import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { taxPlanFor, calculateTax, validateBuyer, zohoTaxIdFor } = require('../server/utils/gstTax');

test('buyer in Telangana gets GST18 (intra-state)', () => {
  const p = taxPlanFor({ buyer_country: 'India', buyer_state: 'Telangana' });
  assert.equal(p.key, 'GST18');
  assert.equal(p.supply, 'intra_state');
  assert.equal(p.placeOfSupply, '36');
});

test('buyer in another Indian state gets IGST18 (inter-state)', () => {
  const p = taxPlanFor({ buyer_country: 'India', buyer_state: 'Karnataka' });
  assert.equal(p.key, 'IGST18');
  assert.equal(p.supply, 'inter_state');
  assert.equal(p.placeOfSupply, '29');
});

test('buyer outside India gets IGST0 export with no place of supply', () => {
  const p = taxPlanFor({ buyer_country: 'United States' });
  assert.equal(p.key, 'IGST0');
  assert.equal(p.supply, 'export');
  assert.equal(p.gstTreatment, 'overseas');
  assert.equal(p.placeOfSupply, null);
});

test('India requires a valid state; blank or unknown states are refused', () => {
  assert.throws(() => taxPlanFor({ buyer_country: 'India' }), /valid Indian state/);
  assert.throws(() => taxPlanFor({ buyer_country: 'India', buyer_state: 'Atlantis' }), /valid Indian state/);
});

test('a buyer country is always required', () => {
  assert.throws(() => validateBuyer({ buyer_state: 'Telangana' }), /country is required/);
});

test('each tax rate needs its own configured Zoho tax ID; none is guessed', () => {
  assert.throws(() => zohoTaxIdFor('GST18', {}), /ZOHO_TAX_ID_GST18 is not configured/);
  assert.equal(zohoTaxIdFor('IGST0', { ZOHO_TAX_ID_IGST0: '123' }), '123');
});

test('GST-exclusive totals are charged consistently in integer paise', () => {
  const telangana = calculateTax({ buyer_country: 'India', buyer_state: 'Telangana', taxable_amount_paise: 99900 });
  assert.deepEqual({ cgst: telangana.cgst_paise, sgst: telangana.sgst_paise, igst: telangana.igst_paise, total: telangana.total_price_paise }, { cgst: 8991, sgst: 8991, igst: 0, total: 117882 });
  const interstate = calculateTax({ buyer_country: 'India', buyer_state: 'Karnataka', taxable_amount_paise: 99900 });
  assert.deepEqual({ cgst: interstate.cgst_paise, sgst: interstate.sgst_paise, igst: interstate.igst_paise, total: interstate.total_price_paise }, { cgst: 0, sgst: 0, igst: 17982, total: 117882 });
  const exportOrder = calculateTax({ buyer_country: 'United States', taxable_amount_paise: 99900 });
  assert.equal(exportOrder.total_price_paise, 99900);
});
