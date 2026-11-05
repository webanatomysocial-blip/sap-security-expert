// PREPARED, NOT RUN. Re-sanitises stored news and learning rows saved before the sanitiser
// was applied. Covers the body and draft body, plus the FAQ JSON (question/answer) in faqs and
// draft_faqs. Only fields whose text would change are written.
//
//   Dry run (default, read-only):  node scripts/migrate-news-learnings-sanitise.js
//   Apply (writes):                node scripts/migrate-news-learnings-sanitise.js --apply --backup=<file.json> --confirm=I_HAVE_A_BACKUP
//   Restore (reverts an apply):    node scripts/migrate-news-learnings-sanitise.js --restore=<file.json> --confirm=I_HAVE_A_BACKUP
//
// Writes are compare-and-set (WHERE id=? AND field=<value read>), so a row edited since the read
// is skipped rather than overwritten. The script prints the target database before doing anything.
'use strict';
const fs = require('fs');
const path = require('path');
const { openMigrationDb } = require('./lib/migration-db');
const { sanitizeBlogHtml } = require('../utils/sanitize');

const TEXT_FIELDS = ['content', 'draft_content'];
const FAQ_FIELDS = ['faqs', 'draft_faqs'];

// Sanitises the text of a FAQ JSON array. Returns the new JSON string, or the input unchanged
// when nothing would change or the value is not a JSON array (those are reported, not rewritten).
function sanitiseFaqJson(raw) {
  if (!raw) return raw;
  let items;
  try { items = JSON.parse(raw); } catch { return raw; }
  if (!Array.isArray(items)) return raw;
  let changed = false;
  const out = items.map((f) => {
    if (!f || typeof f !== 'object') return f;
    const next = { ...f };
    for (const k of ['question', 'answer']) {
      if (typeof f[k] === 'string') {
        const s = sanitizeBlogHtml(f[k]);
        if (s !== f[k]) { next[k] = s; changed = true; }
      }
    }
    return next;
  });
  return changed ? JSON.stringify(out) : raw;
}

// Pure. Returns one change per field that would be rewritten.
function planSanitise(rows) {
  const changes = [];
  for (const r of rows) {
    for (const f of TEXT_FIELDS) {
      const before = r[f];
      if (!before) continue;
      const after = sanitizeBlogHtml(before);
      if (after !== before) changes.push({ id: r.id, type: r.type, field: f, before, after });
    }
    for (const f of FAQ_FIELDS) {
      const before = r[f];
      if (!before) continue;
      const after = sanitiseFaqJson(before);
      if (after !== before) changes.push({ id: r.id, type: r.type, field: f, before, after });
    }
  }
  return changes;
}

// Backups are created exclusively: an existing file is never overwritten, because it may be the
// only record needed to restore an earlier apply.
function writeBackupOnce(file, data) {
  try {
    fs.writeFileSync(file, data, { flag: 'wx' });
  } catch (e) {
    if (e.code === 'EEXIST') { const err = new Error(`refusing to overwrite existing backup: ${file}`); err.exitCode = 2; throw err; }
    throw e;
  }
}

async function restore(db, file) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  let restored = 0; let skipped = 0;
  for (const c of data.changes) {
    const [res] = await db.execute(`UPDATE blogs SET ${c.field} = ? WHERE id = ? AND ${c.field} = ?`, [c.before, c.id, c.after]);
    if ((res.affectedRows ?? res.changes) === 1) restored++; else skipped++;
  }
  console.log(`[migration] restored ${restored}; skipped ${skipped} (changed since apply)`);
}

let closeDb = async () => {};
async function finish(code) { await closeDb(); process.exit(code); }

async function main() {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const arg = (name) => (args.find((a) => a.startsWith(`--${name}=`)) || '').slice(name.length + 3);
  const backupArg = arg('backup');
  const restoreArg = arg('restore');
  const confirmed = args.includes('--confirm=I_HAVE_A_BACKUP');
  const { db, close } = await openMigrationDb();
  closeDb = close;
  console.log(`[migration] database: ${process.env.DB_CONNECTION || 'sqlite'} / ${process.env.DB_NAME || 'local file'}`);

  if (restoreArg) {
    if (!confirmed) { console.error('[migration] refusing to restore: needs --confirm=I_HAVE_A_BACKUP'); await finish(2); }
    await restore(db, restoreArg);
    await finish(0);
  }
  if (apply && (!backupArg || !confirmed)) {
    console.error('[migration] refusing to apply: needs --backup=<file> and --confirm=I_HAVE_A_BACKUP');
    await finish(2);
  }
  const [rows] = await db.execute(
    "SELECT id, type, content, draft_content, faqs, draft_faqs FROM blogs WHERE `type` IN ('news','learning')"
  );
  const changes = planSanitise(rows);
  const byField = {};
  for (const c of changes) byField[c.field] = (byField[c.field] || 0) + 1;
  console.log(`[migration] ${rows.length} news/learning rows; ${changes.length} fields would change`, JSON.stringify(byField));
  if (!apply) { console.log('[migration] dry run only — nothing written'); await finish(0); }

  writeBackupOnce(backupArg, JSON.stringify({
    takenAt: new Date().toISOString(),
    database: process.env.DB_NAME || 'local file',
    changes,
  }, null, 2));
  let written = 0; let skipped = 0;
  for (const c of changes) {
    const [res] = await db.execute(`UPDATE blogs SET ${c.field} = ? WHERE id = ? AND ${c.field} = ?`, [c.after, c.id, c.before]);
    if ((res.affectedRows ?? res.changes) === 1) written++; else skipped++;
  }
  console.log(`[migration] wrote ${written}; skipped ${skipped} (changed since read). backup: ${backupArg}`);
  await finish(0);
}

module.exports = { planSanitise, sanitiseFaqJson };
if (require.main === module) main().catch(async (e) => { console.error('[migration] failed:', e.message); await closeDb(); process.exit(e.exitCode || 1); });
