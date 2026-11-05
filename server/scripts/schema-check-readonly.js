// READ-ONLY schema check. Compares a database with the tables and columns this code expects,
// so drift is visible before any migration is considered. SELECT on information_schema only.
//
//   node scripts/schema-check-readonly.js
//
// Expectations come from the code paths named beside each entry. Nothing is created or altered.
'use strict';
const path = require('path');
const { openMigrationDb } = require('./lib/migration-db');

// [table, column or null, minimum varchar width or null, why the code needs it]
const EXPECT = [
  ['verification_codes', 'code', 64, 'OTP hashes are 64 hex chars (services/OTPService.js hashOtp)'],
  ['ambassadors', null, null, 'created at startup by db.js ensureMySQLTables; missing from schema.sql'],
  ['ambassador_badge_history', null, null, 'ambassador badges (db.js)'],
  ['contributors', 'approved_at', null, 'backfillContributorApprovedAt (db.js)'],
  ['account_session_revocations', null, null, 'created on first revocation (services/sessionRevocation.js)'],
  ['password_reset_tokens', 'expires_at', null, 'single-use reset tokens (otpRepository.claimResetToken)'],
  ['members', 'is_deleted', null, 'member suspend/delete checks (sessionRevocation.isMemberBlocked)'],
  ['members', 'status', null, 'member suspend/delete checks (sessionRevocation.isMemberBlocked)'],
  ['users', 'contributor_id', null, 'role demotion / contributor removal (authRepository)'],
  ['user_permissions', 'can_access_premium_articles', null, 'permission refresh (middleware/permissions)'],
  ['blogs', 'cta_button_link', 255, 'CTA URL normalisation scope'],
  ['file_ownership', null, null, 'ownership migration (PENDING: not run anywhere)'],
  ['file_ownership_audit', null, null, 'ownership migration (PENDING: not run anywhere)'],
  ['email_queue', null, null, 'queued transactional mail (no OTP codes are queued any more)'],
];

async function main() {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  const { db, isSQLite, close } = await openMigrationDb();
  try {
    if (isSQLite) { console.log('[schema-check] SQLite is not supported by this check; run it against MySQL/MariaDB.'); return; }
    await db.query('SET SESSION TRANSACTION READ ONLY');
    const [[{ db: name }]] = await db.query('SELECT DATABASE() AS db');
    const [[{ mode: sqlMode, ver: version }]] = await db.query('SELECT @@GLOBAL.sql_mode AS mode, VERSION() AS ver');
    const strict = /STRICT_TRANS_TABLES|STRICT_ALL_TABLES/.test(sqlMode);
    console.log(`[schema-check] database: ${name} (read-only session)`);
    console.log(`[schema-check] server: ${version}`);
    console.log(`[schema-check] sql_mode: ${sqlMode || '(empty)'} — strict: ${strict ? 'yes' : 'NO (over-long values are silently truncated)'}`);
    const [cols] = await db.query(
      `SELECT TABLE_NAME AS t, COLUMN_NAME AS c, DATA_TYPE AS dt, CHARACTER_MAXIMUM_LENGTH AS len
         FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()`
    );
    const [tables] = await db.query("SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()");
    const tableSet = new Set(tables.map((r) => r.t));
    const colMap = new Map(cols.map((r) => [`${r.t}.${r.c}`, r]));
    const report = EXPECT.map(([table, column, minLen, why]) => {
      if (!tableSet.has(table)) return { item: table, status: 'MISSING TABLE', why };
      if (!column) return { item: table, status: 'present', why };
      const col = colMap.get(`${table}.${column}`);
      if (!col) return { item: `${table}.${column}`, status: 'MISSING COLUMN', why };
      if (minLen && (Number(col.len) || 0) < minLen) return { item: `${table}.${column}`, status: `TOO NARROW (${col.dt}(${col.len}), need ${minLen})`, why };
      return { item: `${table}.${column}`, status: `present (${col.dt}${col.len ? '(' + col.len + ')' : ''})`, why };
    });
    for (const r of report) console.log(`  ${r.status.padEnd(34)} ${r.item}  — ${r.why}`);
    const problems = report.filter((r) => !/^present/.test(r.status)).length;
    console.log(`[schema-check] ${report.length} expectations, ${problems} not met (migrations pending or drift)`);
  } finally {
    await close();
  }
}
main().catch((e) => { console.error('[schema-check] failed:', e.message); process.exit(1); });
