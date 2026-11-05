// Builds the emailed password-reset link.
//
// The token and email travel in the URL FRAGMENT (#token=...&email=...). Browsers never send
// the fragment to the server, so Nginx access logs, application request logs and Referer
// headers cannot contain the token. The reset page reads the fragment and posts the token in
// a JSON body (see src/utils/resetLink.js).
'use strict';

function buildResetLink(siteUrl, token, email) {
  const base = String(siteUrl || '').replace(/\/$/, '');
  const fragment = new URLSearchParams({ token: String(token), email: String(email) }).toString();
  return `${base}/reset-password#${fragment}`;
}

module.exports = { buildResetLink };
