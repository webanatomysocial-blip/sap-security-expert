'use strict';
// GST tax choice for credit and membership purchases.
// Rules (supplier: Shift Orbits LLP, Telangana, 36):
//   buyer in Telangana          -> GST18  (Zoho splits into CGST 9% + SGST 9%)
//   buyer in another Indian state -> IGST18
//   buyer outside India          -> IGST0  (export, zero-rated)

// GST state codes, as printed on GST tax invoices.
const GST_STATES = {
  'Andhra Pradesh': '37', 'Arunachal Pradesh': '12', 'Assam': '18', 'Bihar': '10', 'Chhattisgarh': '22',
  'Goa': '30', 'Gujarat': '24', 'Haryana': '06', 'Himachal Pradesh': '02', 'Jharkhand': '20',
  'Karnataka': '29', 'Kerala': '32', 'Madhya Pradesh': '23', 'Maharashtra': '27', 'Manipur': '14',
  'Meghalaya': '17', 'Mizoram': '15', 'Nagaland': '13', 'Odisha': '21', 'Punjab': '03', 'Rajasthan': '08',
  'Sikkim': '11', 'Tamil Nadu': '33', 'Telangana': '36', 'Tripura': '16', 'Uttar Pradesh': '09',
  'Uttarakhand': '05', 'West Bengal': '19', 'Andaman and Nicobar Islands': '35', 'Chandigarh': '04',
  'Dadra and Nagar Haveli and Daman and Diu': '26', 'Delhi': '07', 'Jammu and Kashmir': '01',
  'Ladakh': '38', 'Lakshadweep': '31', 'Puducherry': '34',
};

const SUPPLIER_STATE = 'Telangana';
const GST_RATE_BPS = 1800; // 18.00%; amounts are integer paise.

// Validate buyer location from checkout. Throws a readable error when the buyer is incomplete.
function validateBuyer({ buyer_country, buyer_state } = {}) {
  const country = String(buyer_country || '').trim();
  if (!country) throw new Error('Buyer country is required');
  if (country.length > 60) throw new Error('Buyer country is too long');
  if (country.toLowerCase() === 'india') {
    const state = String(buyer_state || '').trim();
    if (!Object.prototype.hasOwnProperty.call(GST_STATES, state)) throw new Error('A valid Indian state is required');
    return { buyer_country: 'India', buyer_state: state };
  }
  return { buyer_country: country, buyer_state: null };
}

// Decide the GST treatment for a validated buyer. Pure: no network, no environment.
function taxPlanFor({ buyer_country, buyer_state }) {
  const b = validateBuyer({ buyer_country, buyer_state });
  if (b.buyer_country !== 'India') {
    return { key: 'IGST0', supply: 'export', gstTreatment: 'overseas', placeOfSupply: null };
  }
  const placeOfSupply = GST_STATES[b.buyer_state];
  if (b.buyer_state === SUPPLIER_STATE) {
    return { key: 'GST18', supply: 'intra_state', gstTreatment: 'consumer', placeOfSupply };
  }
  return { key: 'IGST18', supply: 'inter_state', gstTreatment: 'consumer', placeOfSupply };
}

// Calculate GST from the discounted GST-exclusive taxable amount. Persist this
// result with the order; Razorpay, Zoho and the invoice must use this snapshot.
function calculateTax({ buyer_country, buyer_state, taxable_amount_paise }) {
  const plan = taxPlanFor({ buyer_country, buyer_state });
  const taxable = Number(taxable_amount_paise);
  if (!Number.isInteger(taxable) || taxable < 0) throw new Error('A valid taxable amount is required');
  const gst = plan.key === 'IGST0' ? 0 : Math.round(taxable * GST_RATE_BPS / 10000);
  const cgst = plan.key === 'GST18' ? Math.floor(gst / 2) : 0;
  const sgst = plan.key === 'GST18' ? gst - cgst : 0;
  const igst = plan.key === 'IGST18' ? gst : 0;
  return { ...plan, gst_rate_bps: plan.key === 'IGST0' ? 0 : GST_RATE_BPS,
    taxable_amount_paise: taxable, cgst_paise: cgst, sgst_paise: sgst,
    igst_paise: igst, gst_paise: gst, total_price_paise: taxable + gst };
}

// Zoho tax ID for a plan key. Each rate is configured explicitly, so a missing ID is an error, never a silent 0%.
function zohoTaxIdFor(key, env = process.env) {
  const id = env[`ZOHO_TAX_ID_${key}`];
  if (!id) throw new Error(`ZOHO_TAX_ID_${key} is not configured`);
  return id;
}

module.exports = { GST_STATES, validateBuyer, taxPlanFor, calculateTax, zohoTaxIdFor };
