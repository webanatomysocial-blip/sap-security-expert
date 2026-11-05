// PREPARED, NOT RUN. Re-sanitises stored news and learning bodies that were saved
// before the sanitiser was applied. Only rows whose content would change are touched.
//
//   Dry run (default, read-only):   node scripts/migrate-news-learnings-sanitise.js
//   Apply (writes):                 node scripts/migrate-news-learnings-sanitise.js \
//                                     --apply --backup=<file.json> --confirm=I_HAVE_A_BACKUP
//
// The script prints which database it is connected to before doing anything.
// It refuses to apply without a backup path and the confirmation phrase.
'use strict';
const fs = require('fs');
const path = require('path');
const { sanitizeBlogHtml } = require('../utils/sanitize');

function planSanitise(rows) {
  return rows
    .map((r) => {
      const after = sanitizeBlogHtml(r.content || '');
      return { id: r.id, type: r.type, changed: after !== (r.content || ''), before: r.content || '', after };
    })
    .filter((c) => c.changed);
}

async function main() {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const backupArg = (args.find((a) => a.startsWith('--backup=')) || '').slice('--backup='.length);
  const confirmed = args.includes('--confirm=I_HAVE_A_BACKUP');
  const { poolExec: db, isSQLite } = require('../db');
  console.log(`[migration] database: ${process.env.DB_CONNECTION || 'sqlite'} / ${process.env.DB_NAME || 'local file'}`);
  if (apply && (!backupArg || !confirmed)) {
    console.error('[migration] refusing to apply: needs --backup=<file> and --confirm=I_HAVE_A_BACKUP');
    process.exit(2);
  }
  const [rows] = await db.execute("SELECT id, type, content FROM blogs WHERE type IN ('news','learning')");
  const plan = planSanitise(rows);
  console.log(`[migration] ${rows.length} news/learning rows; ${plan.length} would change`);
  if (!apply) { console.log('[migration] dry run only — nothing written'); process.exit(0); }
  fs.writeFileSync(backupArg, JSON.stringify(plan.map((p) => ({ id: p.id, before: p.before })), null, 2));
  console.log(`[migration] backup written to ${backupArg} (${plan.length} rows)`);
  for (const c of plan) await db.execute('UPDATE blogs SET content = ? WHERE id = ?', [c.after, c.id]);
  console.log(`[migration] updated ${plan.length} rows`);
  process.exit(0);
}

module.exports = { planSanitise };
if (require.main === module) main().catch((e) => { console.error('[migration] failed:', e.message); process.exit(1); });
