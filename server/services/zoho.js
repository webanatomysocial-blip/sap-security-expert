// Zoho Books API integration — invoice creation & delivery for credit purchases.
// Data center: zoho.in (India). All amounts in INR paise → converted to INR here.
'use strict';
const https = require('https');

const AUTH_URL  = 'https://accounts.zoho.in/oauth/v2/token';
const API_BASE  = 'https://www.zohoapis.in/books/v3';
const ORG_ID    = () => process.env.ZOHO_ORG_ID || '';

// ── token cache ────────────────────────────────────────────────────────────────
let _tokenCache = { token: null, expiresAt: 0 };

async function getAccessToken() {
  if (_tokenCache.token && Date.now() < _tokenCache.expiresAt - 60_000) {
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

function apiGet(path, token) {
  return request('GET', `${API_BASE}${path}?organization_id=${ORG_ID()}`, token);
}
function apiPost(path, token, payload) {
  return request('POST', `${API_BASE}${path}?organization_id=${ORG_ID()}`, token, JSON.stringify(payload));
}

// Stream Zoho invoice PDF into a writable (e.g. res). Returns a Promise that resolves when done.
function streamInvoicePdf(invoiceId, token, writable) {
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
async function getOrCreateContact(token, { name, email }) {
  const search = await request(
    'GET',
    `${API_BASE}/contacts?organization_id=${ORG_ID()}&email=${encodeURIComponent(email)}`,
    token,
  );
  const existing = search?.contacts?.[0];
  if (existing?.contact_id) return existing.contact_id;

  const created = await apiPost('/contacts', token, {
    contact_name: name || email,
    contact_type: 'customer',
    contact_persons: [{ email, is_primary_contact: true }],
  });
  if (!created?.contact?.contact_id) throw new Error(`Zoho contact create failed: ${JSON.stringify(created)}`);
  return created.contact.contact_id;
}

// ── main entry point ───────────────────────────────────────────────────────────
// Fire-and-forget safe: caller catches and logs. Never throws into payment flow.
async function createAndSendInvoice({ orderId, paymentId, member, bundle, amountPaise }) {
  const missingEnv = ['ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN', 'ZOHO_ORG_ID']
    .filter((k) => !process.env[k]);
  if (missingEnv.length) {
    console.warn('[zoho] skipped — missing env:', missingEnv.join(', '));
    return null;
  }

  const token     = await getAccessToken();
  const contactId = await getOrCreateContact(token, { name: member.name, email: member.email });
  const amountINR = (amountPaise / 100).toFixed(2);

  const lineItem = {
    description: bundle.description || `${bundle.name} — ${bundle.credits} credits`,
    quantity:    1,
    rate:        parseFloat(amountINR),
    ...(process.env.ZOHO_TAX_ID ? { tax_id: process.env.ZOHO_TAX_ID } : {}),
  };

  const invoicePayload = {
    customer_id:     contactId,
    reference_number: orderId,
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

module.exports = { createAndSendInvoice, getInvoicePdf };
