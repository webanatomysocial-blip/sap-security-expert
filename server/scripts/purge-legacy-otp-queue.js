// PREPARED, NOT RUN against any real database. Deletes legacy plaintext OTP rows from email_queue.
//
// Dry run is the default and writes nothing. Applying requires ALL of:
//   --apply
//   --backup=<file>          an existing, non-empty mariadb-dump of email_queue (validated below)
//   --target=<db name>       must equal DB_NAME (guards against the wrong database)
//   --expected-count=<N>     must equal the number of matching rows at apply time
//   --confirm=PURGE_LEGACY_OTP_ROWS
//
// Deletes only rows matching the shared selection rule, in id batches, re-checking the rule on
// every DELETE. Verifies afterwards that no matching row remains and that all other rows are
// unchanged in count. Prints counts only.
'use strict';
const fs = require('fs');
const path = require('path');
const { openMigrationDb } = require('./lib/migration-db');
const { WHERE, PARAM } = require('./legacy-otp-queue-select');

const BATCH = 500;

function arg(args, name) { return (args.find((a) => a.startsWith(`--${name}=`)) || '').slice(name.length + 3); }

function validateBackup(file) {
  if (!fs.existsSync(file)) throw new Error(`backup file not found: ${file}`);
  const size = fs.statSync(file).size;
  if (size === 0) throw new Error('backup file is empty');
  const head = fs.readFileSync(file, 'utf8').slice(0, 200000);
  if (!/CREATE TABLE `email_queue`/.test(head)) throw new Error('backup does not contain a dump of email_queue');
  return size;
}

async function main() {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const { db, isSQLite, close } = await openMigrationDb();
  const finish = async (code) => { await close(); process.exit(code); };
  try {
    if (isSQLite) { console.log('[purge] SQLite is not supported.'); return finish(0); }
    const [[{ db: name }]] = await db.query('SELECT DATABASE() AS db');
    console.log(`[purge] target database: ${name}`);

    const [[before]] = await db.query('SELECT COUNT(*) AS n FROM email_queue');
    const [[cand]] = await db.query(`SELECT COUNT(*) AS n FROM email_queue WHERE ${WHERE}`, [PARAM]);
    console.log(`[purge] rows in email_queue: ${before.n}; matching legacy OTP rows: ${cand.n}`);

    if (!apply) {
      console.log('[purge] dry run only. Nothing was written.');
      return finish(0);
    }

    // Every guard is checked before the first DELETE.
    const problems = [];
    const backup = arg(args, 'backup');
    if (!backup) problems.push('--backup=<file> is required');
    else { try { validateBackup(backup); } catch (e) { problems.push(e.message); } }
    if (arg(args, 'target') !== name) problems.push(`--target must equal the database name (${name})`);
    if (String(Number(arg(args, 'expected-count'))) !== String(cand.n) || arg(args, 'expected-count') === '') {
      problems.push(`--expected-count must equal ${cand.n}`);
    }
    if (!args.includes('--confirm=PURGE_LEGACY_OTP_ROWS')) problems.push('--confirm=PURGE_LEGACY_OTP_ROWS is required');
    if (problems.length) {
      console.error('[purge] refusing to apply:\n  - ' + problems.join('\n  - '));
      return finish(2);
    }

    let deleted = 0;
    for (;;) {
      const [ids] = await db.query(`SELECT id FROM email_queue WHERE ${WHERE} ORDER BY id LIMIT ${BATCH}`, [PARAM]);
      if (!ids.length) break;
      const list = ids.map((r) => r.id);
      const [res] = await db.query(
        `DELETE FROM email_queue WHERE id IN (${list.map(() => '?').join(',')}) AND ${WHERE}`, [...list, PARAM]);
      deleted += res.affectedRows;
    }

    const [[remaining]] = await db.query(`SELECT COUNT(*) AS n FROM email_queue WHERE ${WHERE}`, [PARAM]);
    const [[after]] = await db.query('SELECT COUNT(*) AS n FROM email_queue');
    console.log(`[purge] expected to delete: ${cand.n}; deleted: ${deleted}; matching rows remaining: ${remaining.n}`);
    console.log(`[purge] rows before: ${before.n}; after: ${after.n}; other rows unchanged: ${Number(before.n) - deleted === Number(after.n)}`);
    if (Number(remaining.n) !== 0 || deleted !== Number(cand.n)) {
      console.error('[purge] verification FAILED. Restore from the backup before doing anything else.');
      return finish(1);
    }
    console.log('[purge] verification passed.');
    return finish(0);
  } catch (e) {
    console.error('[purge] failed:', e.message);
    return finish(1);
  }
}
main();
