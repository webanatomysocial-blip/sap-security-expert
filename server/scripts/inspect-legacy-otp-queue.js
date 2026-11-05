// READ-ONLY inspection of legacy plaintext OTP rows in email_queue.
// Prints counts and metadata only. Never prints recipients, subjects, bodies or codes.
//
//   DB_CONNECTION=mysql DB_HOST=<host> DB_PORT=<port> DB_NAME=<db> DB_USER=<select_only_user> DB_PASS=<pw> \
//     node server/scripts/inspect-legacy-otp-queue.js
'use strict';
const path = require('path');
const { openMigrationDb } = require('./lib/migration-db');
const { WHERE, PARAM, OTP_SUBJECTS } = require('./legacy-otp-queue-select');

async function main() {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  const { db, isSQLite, close } = await openMigrationDb();
  try {
    if (isSQLite) { console.log('[inspect] SQLite is not supported; run against MySQL/MariaDB.'); return; }
    await db.query('SET SESSION TRANSACTION READ ONLY');
    const [[{ db: name }]] = await db.query('SELECT DATABASE() AS db');
    const [[{ ver }]] = await db.query('SELECT VERSION() AS ver');
    console.log(`[inspect] database: ${name} | server: ${ver} | read-only session`);

    const [[t]] = await db.query("SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'email_queue'");
    if (!Number(t.n)) { console.log('[inspect] email_queue does not exist in this database. Nothing to clean.'); return; }
    const [[total]] = await db.query('SELECT COUNT(*) AS n FROM email_queue');
    console.log(`[inspect] email_queue rows (all): ${total.n}`);

    const [[cand]] = await db.query(`SELECT COUNT(*) AS n FROM email_queue WHERE ${WHERE}`, [PARAM]);
    console.log(`[inspect] legacy OTP rows (selection rule): ${cand.n}`);
    if (!Number(cand.n)) { console.log('[inspect] no rows match. Nothing to purge.'); return; }

    const [byStatus] = await db.query(`SELECT COALESCE(status,'(null)') AS status, COUNT(*) AS n FROM email_queue WHERE ${WHERE} GROUP BY status`, [PARAM]);
    console.log('[inspect] by status:', byStatus.map((r) => `${r.status}=${r.n}`).join(', '));

    const [byAge] = await db.query(
      `SELECT CASE
                WHEN created_at >= NOW() - INTERVAL 10 MINUTE THEN 'under 10 min (code may still be valid)'
                WHEN created_at >= NOW() - INTERVAL 1 DAY THEN '10 min to 1 day'
                ELSE 'over 1 day' END AS age, COUNT(*) AS n
         FROM email_queue WHERE ${WHERE} GROUP BY age`, [PARAM]);
    console.log('[inspect] by age:', byAge.map((r) => `${r.age}=${r.n}`).join('; '));

    const [[range]] = await db.query(`SELECT MIN(created_at) AS first, MAX(created_at) AS last FROM email_queue WHERE ${WHERE}`, [PARAM]);
    console.log(`[inspect] created_at range: ${range.first} .. ${range.last}`);

    const [[plain]] = await db.query(
      `SELECT COUNT(*) AS n FROM email_queue WHERE ${WHERE} AND body REGEXP 'verification code is:[^0-9]*<strong>[0-9]{6}</strong>'`, [PARAM]);
    console.log(`[inspect] rows whose body still holds a six-digit code: ${plain.n} (values not shown)`);

    const subjPh = OTP_SUBJECTS.map(() => '?').join(',');
    const [[subj]] = await db.query(`SELECT COUNT(*) AS n FROM email_queue WHERE ${WHERE} AND subject IN (${subjPh})`, [PARAM, ...OTP_SUBJECTS]);
    console.log(`[inspect] rows with a known OTP subject: ${subj.n} of ${cand.n}`);
    console.log(`[inspect] rows the purge would delete: ${cand.n}; rows kept: ${Number(total.n) - Number(cand.n)}`);
  } finally {
    await close();
  }
}
main().catch((e) => { console.error('[inspect] failed:', e.message); process.exit(1); });
