// Single place that decides how each external service (SMTP mail, Zoho Books)
// behaves. Modes:
//   LIVE — real network calls. Only in production by default, or when set explicitly.
//   TEST — mail goes to a local test SMTP server (Mailpit, default 127.0.0.1:1025).
//   MOCK — nothing leaves the process: mail uses a JSON transport, Zoho is faked.
//
// Defaults: production (NODE_ENV=production) → LIVE; anything else → MOCK.
// Override per service with MAIL_MODE / ZOHO_MODE. LIVE is refused inside the
// automated test suite (any process whose argv points into server/tests/).
'use strict';

const MODES = ['live', 'test', 'mock'];
const logged = new Set();

function isAutomatedTestRun() {
  return process.argv.some((a) => /[\\/]tests[\\/]/.test(a));
}

function resolveMode(service) {
  const explicit = (process.env[`${service}_MODE`] || '').trim().toLowerCase();
  const mode = explicit || (process.env.NODE_ENV === 'production' ? 'live' : 'mock');
  if (!MODES.includes(mode)) {
    throw new Error(`${service}_MODE must be one of live|test|mock (got "${explicit}")`);
  }
  if (mode === 'live' && isAutomatedTestRun()) {
    throw new Error(`${service} LIVE mode is refused in automated tests`);
  }
  if (!logged.has(service)) {
    logged.add(service);
    const detail = service === 'MAIL'
      ? (mode === 'test' ? ` → ${process.env.MAILPIT_HOST || '127.0.0.1'}:${process.env.MAILPIT_PORT || 1025}` : '')
      : '';
    console.log(`[external] ${service}=${mode.toUpperCase()}${detail}${explicit ? ' (explicit)' : ' (default)'}`);
  }
  return mode;
}

function logStatus() {
  resolveMode('MAIL');
  resolveMode('ZOHO');
}

module.exports = { resolveMode, logStatus, isAutomatedTestRun };
