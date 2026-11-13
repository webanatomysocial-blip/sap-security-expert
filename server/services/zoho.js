// Zoho Books API integration — invoice creation & delivery for credit purchases.
// Data center: zoho.in (India). All amounts in INR paise → converted to INR here.
'use strict';
const https = require('https');
const { resolveMode } = require('./externalMode');

// Every network call goes through this guard, so a non-LIVE process can't reach Zoho
// even if a new code path forgets to check the mode.
function assertLive(what) {
  const mode = resolveMode('ZOHO');
  if (mode !== 'live') throw new Error(`Zoho ${what} blocked: ZOHO_MODE=${mode}`);
}

const { taxPlanFor, zohoTaxIdFor } = require('../utils/gstTax');
const AUTH_URL  = 'https://accounts.zoho.in/oauth/v2/token';
const API_BASE  = 'https://www.zohoapis.in/books/v3';
const ORG_ID    = () => process.env.ZOHO_ORG_ID || '';

// ── token cache ────────────────────────────────────────────────────────────────
let _tokenCache = { token: null, expiresAt: 0 };

async function getAccessToken() {
  if (_tokenCache.token && Date.now() < _tokenCache.expiresAt - 60000) {
    return _tokenCache.token;
  }
  const params = new URLSearchParams({
    grant_type:    'refresh_token',
    client_id:     process.env.ZOHO_CLIENT_ID     || '',
    client_secret: process.env.ZOHO_CLIENT_SECRET || '',
    refresh_token: process.env.ZOHO_REFRESH_TOKEN || '',
  });
  const body = await request('POST', AUTH_URL, null, params.toString(), 'application/x-www-form-urlencoded');
  if (!body.access_token) throw new Error(`Zoho token error: ${JSON.stringify(body)}`);
  _tokenCache = { token: body.access_token, expiresAt: Date.now() + (body.expires_in || 3600) * 1000 };
  return _tokenCache.token;
}

// ── low-level fetch ────────────────────────────────────────────────────────────
function request(method, url, token, bodyStr, contentType = 'application/json') {
  assertLive('request');
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method,
      headers: {
        'Content-Type': contentType,
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
        ...(token   ? { Authorization: `Zoho-oauthtoken ${token}` } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ _raw: data }); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function apiPost(path, token, payload) {
  return request('POST', `${API_BASE}${path}?organization_id=${ORG_ID()}`, token, JSON.stringify(payload));
}

// Stream Zoho invoice PDF into a writable (e.g. res). Returns a Promise that resolves when done.
function streamInvoicePdf(invoiceId, token, writable) {
  assertLive('PDF download');
  return new Promise((resolve, reject) => {
    const u = new URL(`${API_BASE}/invoices/${invoiceId}?organization_id=${ORG_ID()}`);
    const options = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      headers: {
        Accept: 'application/pdf',
        Authorization: `Zoho-oauthtoken ${token}`,
      },
    };
    const req = https.request(options, (res) => {
      res.pipe(writable);
      res.on('end', resolve);
      res.on('error', reject);
    });
    req.on('error', reject);
    req.end();
  });
}

async function getInvoicePdf(invoiceId, writable) {
  const token = await getAccessToken();
  return streamInvoicePdf(invoiceId, token, writable);
}

// ── contact: find by email or create ──────────────────────────────────────────
async function getOrCreateContact(token, { name, email, gstTreatment, placeOfSupply }) {
  const search = await request(
    'GET',
    `${API_BASE}/contacts?organization_id=${ORG_ID()}&email=${encodeURIComponent(email)}`,
    token,
  );
  const existing = search?.contacts?.[0];
  // Keep the buyer's GST treatment and place of supply current on the contact.
  const gst = { gst_treatment: gstTreatment, ...(placeOfSupply ? { place_of_supply: placeOfSupply } : {}) };
  if (existing?.contact_id) {
    await request('PUT', `${API_BASE}/contacts/${existing.contact_id}?organization_id=${ORG_ID()}`, token, JSON.stringify(gst));
    return existing.contact_id;
  }

  const created = await apiPost('/contacts', token, {
    contact_name: name || email,
    contact_type: 'customer',
    contact_persons: [{ email, is_primary_contact: true }],
    ...gst,
  });
  if (!created?.contact?.contact_id) throw new Error(`Zoho contact create failed: ${JSON.stringify(created)}`);
  return created.contact.contact_id;
}

// ── main entry point ───────────────────────────────────────────────────────────
// Fire-and-forget safe: caller catches and logs. Never throws into payment flow.
async function createAndSendInvoice({ orderId, paymentId, member, bundle, amountPaise, buyer }) {
  const mode = resolveMode('ZOHO');
  // Tax is chosen from the buyer's location. An order without a valid location gets no invoice, never a guessed tax.
  if (mode !== 'live') {
    // No invoice, no id saved, no email — the order simply has no Zoho invoice.
    let would = 'no buyer location';
    try { would = taxPlanFor(buyer || {}).key; } catch { /* incomplete buyer: nothing to log */ }
    console.log(`[zoho=${mode.toUpperCase()}] invoice not created for order ${orderId} (non-live mode; would use ${would})`);
    return null;
  }
  const plan = taxPlanFor(buyer || {});
  const missingEnv = ['ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN', 'ZOHO_ORG_ID']
    .filter((k) => !process.env[k]);
  if (missingEnv.length) {
    console.warn('[zoho] skipped — missing env:', missingEnv.join(', '));
    return null;
  }

  const token     = await getAccessToken();
  const contactId = await getOrCreateContact(token, {
    name: member.name, email: member.email,
    gstTreatment: plan.gstTreatment, placeOfSupply: plan.placeOfSupply,
  });
  const amountINR = (amountPaise / 100).toFixed(2);

  const lineItem = {
    description: bundle.description || `${bundle.name} — ${bundle.credits} credits`,
    quantity:    1,
    rate:        parseFloat(amountINR),
    tax_id:      zohoTaxIdFor(plan.key),
  };

  const invoicePayload = {
    customer_id:     contactId,
    reference_number: orderId,
    ...(plan.placeOfSupply ? { place_of_supply: plan.placeOfSupply } : {}),
    line_items:      [lineItem],
    notes:           `Razorpay order: ${orderId}${paymentId ? ` | payment: ${paymentId}` : ''}`,
  };

  const invoiceRes = await apiPost('/invoices', token, invoicePayload);
  const invoice = invoiceRes?.invoice;
  if (!invoice?.invoice_id) throw new Error(`Zoho invoice create failed: ${JSON.stringify(invoiceRes)}`);

  const invoiceId  = invoice.invoice_id;
  const invoiceUrl = invoice.invoice_url || null;

  // Email the invoice — non-fatal: invoice is already created so we always return result
  try {
    await apiPost(`/invoices/${invoiceId}/email`, token, {
      send_from_org_email_id: true,
      to_mail_ids:            [member.email],
      subject:                `Your Invoice for ${bundle.name} — SAP Security Expert`,
      body:                   `Hi ${member.name || 'there'},\n\nPlease find your invoice for the purchase of ${bundle.description || `${bundle.name} (${bundle.credits} credits)`} attached.\n\nThank you for your support!\nSAP Security Expert`,
    });
    console.log(`[zoho] invoice ${invoiceId} created and emailed to ${member.email} for order ${orderId}`);
  } catch (emailErr) {
    console.warn(`[zoho] invoice ${invoiceId} created but email failed:`, emailErr.message);
  }

  return { invoiceId, invoiceUrl };
}

// Read-only check of the OAuth connection. Gets a token (refresh grant) and lists
// one invoice. Creates or changes nothing. Requires an explicit ZOHO_MODE=live.
async function readOnlyOrganisationCheck() {
  if (!process.env.ZOHO_MODE || resolveMode('ZOHO') !== 'live') {
    throw new Error('readOnlyOrganisationCheck requires an explicit ZOHO_MODE=live');
  }
  const token = await getAccessToken();
  const body = await request('GET', `${API_BASE}/invoices?organization_id=${ORG_ID()}&per_page=1`, token);
  if (!Array.isArray(body?.invoices)) throw new Error(`Zoho read check failed: ${body?.code} ${body?.message}`);
  return { organisationId: ORG_ID(), tokenRefreshed: true, invoicesVisible: body.page_context?.total ?? body.invoices.length };
}

// Invoice creation test helper. Only callable from scripts/zoho-invoice-test.js, which
// requires explicit authorisation. Creates the invoice WITHOUT emailing anyone.
async function createTestInvoiceNoEmail({ customerEmail, name, amountINR, reference }) {
  if (resolveMode('ZOHO') !== 'live') throw new Error('test invoice requires ZOHO_MODE=live');
  const token = await getAccessToken();
  const contactId = await getOrCreateContact(token, { name, email: customerEmail });
  const created = await apiPost('/invoices', token, {
    customer_id: contactId,
    reference_number: reference,
    line_items: [{ description: 'AUTOMATED TEST INVOICE — VOID AFTER VERIFICATION', quantity: 1, rate: amountINR }],
    notes: 'Integration test. Not a real purchase.',
  });
  if (!created?.invoice?.invoice_id) throw new Error(`Zoho test invoice failed: ${JSON.stringify(created)}`);
  return { invoiceId: created.invoice.invoice_id, invoiceNumber: created.invoice.invoice_number };
}

// Void a specific unpaid test invoice. Callers must provide the invoice ID and
// perform their own explicit confirmation; this function never searches for or
// bulk-voids invoices.
async function voidInvoice(invoiceId) {
  const id = String(invoiceId || '').trim();
  if (!/^\d+$/.test(id)) throw new Error('A numeric Zoho invoice ID is required');
  const token = await getAccessToken();
  const before = await request('GET', `${API_BASE}/invoices/${id}?organization_id=${ORG_ID()}`, token);
  const invoice = before?.invoice;
  if (!invoice?.invoice_id) throw new Error(`Zoho invoice lookup failed: ${before?.code} ${before?.message}`);
  if (invoice.status === 'void') return { invoiceId: id, status: 'void', alreadyVoided: true };
  if (invoice.status === 'paid') throw new Error('Refusing to void a paid invoice; process a refund/credit note instead.');
  const result = await apiPost(`/invoices/${id}/status/void`, token, {});
  if (result?.code !== 0) throw new Error(`Zoho invoice void failed: ${result?.code} ${result?.message}`);
  return { invoiceId: id, status: 'void', invoiceNumber: invoice.invoice_number || null };
}

module.exports = { createAndSendInvoice, getInvoicePdf, readOnlyOrganisationCheck, createTestInvoiceNoEmail, voidInvoice };
