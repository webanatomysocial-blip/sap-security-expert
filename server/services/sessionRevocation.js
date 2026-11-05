// Account-level session revocation. A password reset stamps the account with the
// current time; any session that logged in before that time is ended on its next
// request. Works the same on SQLite and MySQL and does not depend on the session
// store's ability to list sessions.
const TABLE = 'account_session_revocations';
let tableReady = false;

async function ensureTable(db) {
  if (tableReady) return;
  await db.execute(`CREATE TABLE IF NOT EXISTS ${TABLE} (account_key VARCHAR(100) PRIMARY KEY, revoked_at BIGINT NOT NULL)`);
  tableReady = true;
}

async function accountKeysForEmail(db, email) {
  const keys = [];
  const [[m]] = await db.execute('SELECT id FROM members WHERE LOWER(email) = LOWER(?) LIMIT 1', [email]);
  if (m) keys.push(`member:${m.id}`);
  const [[u]] = await db.execute('SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1', [email]);
  if (u) keys.push(`user:${u.id}`);
  return keys;
}

// Ends every session of the account started before now. Returns the revocation time.
async function revokeAccountSessions(db, email) {
  await ensureTable(db);
  const now = Date.now();
  for (const key of await accountKeysForEmail(db, email)) {
    await db.execute(`DELETE FROM ${TABLE} WHERE account_key = ?`, [key]);
    await db.execute(`INSERT INTO ${TABLE} (account_key, revoked_at) VALUES (?, ?)`, [key, now]);
  }
  return now;
}

// Used by a password change: ends the account's other sessions but keeps the
// session that made the change working.
async function revokeOtherSessions(db, email, sess) {
  const ts = await revokeAccountSessions(db, email);
  if (sess) sess.issued_at = ts + 1;
  return ts;
}

function sessionKeys(sess) {
  const keys = [];
  if (sess.member_logged_in && sess.member_id) keys.push(`member:${sess.member_id}`);
  if (sess.admin_logged_in && sess.admin_id) keys.push(`user:${sess.admin_id}`);
  return keys;
}

// A logged-in session is revoked if its account was revoked after the session began.
// Sessions without issued_at (created before this check existed) count as began at 0.
async function isSessionRevoked(db, sess) {
  const keys = sessionKeys(sess);
  if (!keys.length) return false;
  await ensureTable(db);
  const issued = Number(sess.issued_at || 0);
  for (const key of keys) {
    const [[row]] = await db.execute(`SELECT revoked_at FROM ${TABLE} WHERE account_key = ?`, [key]);
    if (row && Number(row.revoked_at) > issued) return true;
  }
  return false;
}

function enforceSessionRevocation(req, res, next) {
  const sess = req.session;
  if (!sess || !(sess.member_logged_in || sess.admin_logged_in)) return next();
  isSessionRevoked(req.db, sess)
    .then((revoked) => {
      if (!revoked) return next();
      sess.destroy(() => {});
      res.status(401).json({ status: 'error', message: 'Your session has ended. Please log in again.' });
    })
    .catch((err) => {
      console.error('[session-revocation]', err.message);
      res.status(503).json({ status: 'error', message: 'Service temporarily unavailable.' });
    });
}

module.exports = { revokeAccountSessions, revokeOtherSessions, isSessionRevoked, enforceSessionRevocation, accountKeysForEmail, sessionKeys, resetTableCacheForTests: () => { tableReady = false; } };
