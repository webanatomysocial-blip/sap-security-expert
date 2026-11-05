// PREPARED, NOT RUN. Normalises stored URL fields that the save-time validators now refuse.
//
// Rewrites ONLY values that are fixable without guessing: a bare domain ("example.com/x")
// becomes "https://example.com/x". Values that are already valid http(s) or in-site paths are
// left alone. Unsafe or unparseable values (javascript:, data:, junk) are REPORTED and never
// written here; an admin must decide what replaces them.
//
//   Dry run (default, read-only):  node scripts/migrate-url-normalise.js
//   Apply (writes):                node scripts/migrate-url-normalise.js --apply --backup=<file.json> --confirm=I_HAVE_A_BACKUP
//   Restore (reverts an apply):    node scripts/migrate-url-normalise.js --restore=<file.json> --confirm=I_HAVE_A_BACKUP
//
// Every write is compare-and-set: UPDATE ... WHERE id=? AND col=<value read>. A row edited by
// someone else since the read is skipped, not overwritten. Restore is the same, in reverse.
'use strict';
const fs = require('fs');
const path = require('path');
const { openMigrationDb } = require('./lib/migration-db');
const { cleanWebUrl } = require('../utils/sanitize');

// `site` = in-site paths ("/learn") are valid for this field (CTA buttons, ads, announcements).
const TARGETS = [
  { table: 'blogs', columns: ['cta_button_link', 'draft_cta_button_link'], site: true },
  { table: 'ads', columns: ['link'], site: true },
  { table: 'announcements', columns: ['link', 'draft_link'], site: true },
  { table: 'contributors', columns: ['linkedin', 'personal_website'], site: false },
  { table: 'contributor_applications', columns: ['linkedin', 'personal_website'], site: false },
  { table: 'users', columns: ['linkedin', 'personal_website'], site: false },
];

// Pure. Returns { status: 'ok' | 'rewrite' | 'manual', value }.
function normaliseUrl(raw, { site }) {
  const v = String(raw).trim();
  if (v === '') return { status: 'ok', value: raw };
  if (site && /^\/(?!\/)/.test(v)) return { status: 'ok', value: raw };
  if (/^https?:\/\//i.test(v)) {
    return cleanWebUrl(v) === null ? { status: 'manual', value: raw } : { status: 'ok', value: raw };
  }
  const fixed = cleanWebUrl(v); // bare domain -> https://; javascript:/data:/junk -> null
  if (fixed === null) return { status: 'manual', value: raw };
  if (fixed === '') return { status: 'ok', value: raw };
  return { status: 'rewrite', value: fixed };
}

// Pure. rows: [{ table, column, id, value, site }] -> [{ table, column, id, before, after, status }]
function planUrlNormalise(rows) {
  return rows.map((r) => {
    const n = normaliseUrl(r.value, { site: r.site });
    return { table: r.table, column: r.column, id: r.id, before: r.value, after: n.value, status: n.status };
  });
}

async function loadRows(db) {
  const out = [];
  for (const t of TARGETS) {
    for (const col of t.columns) {
      const [rows] = await db.execute(
        `SELECT id, ${col} AS value FROM ${t.table} WHERE ${col} IS NOT NULL AND TRIM(${col}) <> ''`
      );
      for (const r of rows) out.push({ table: t.table, column: col, id: r.id, value: r.value, site: t.site });
    }
  }
  return out;
}

function summarise(plan) {
  const by = new Map();
  for (const p of plan) {
    const k = `${p.table}.${p.column}`;
    if (!by.has(k)) by.set(k, { ok: 0, rewrite: 0, manual: 0 });
    by.get(k)[p.status]++;
  }
  return by;
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
    const [res] = await db.execute(`UPDATE ${c.table} SET ${c.column} = ? WHERE id = ? AND ${c.column} = ?`, [c.before, c.id, c.after]);
    if ((res.affectedRows ?? res.changes) === 1) restored++; else skipped++;
  }
  console.log(`[url-normalise] restored ${restored}; skipped ${skipped} (changed since apply)`);
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
  console.log(`[url-normalise] database: ${process.env.DB_CONNECTION || 'sqlite'} / ${process.env.DB_NAME || 'local file'}`);

  if (restoreArg) {
    if (!confirmed) { console.error('[url-normalise] refusing to restore: needs --confirm=I_HAVE_A_BACKUP'); await finish(2); }
    await restore(db, restoreArg);
    await finish(0);
  }
  if (apply && (!backupArg || !confirmed)) {
    console.error('[url-normalise] refusing to apply: needs --backup=<file> and --confirm=I_HAVE_A_BACKUP');
    await finish(2);
  }

  const plan = planUrlNormalise(await loadRows(db));
  for (const [k, v] of summarise(plan)) console.log(`  ${k}: ok=${v.ok} rewrite=${v.rewrite} manual=${v.manual}`);
  const manual = plan.filter((p) => p.status === 'manual');
  manual.forEach((p) => console.log(`  MANUAL ${p.table}.${p.column} id=${p.id} value=${JSON.stringify(String(p.before).slice(0, 80))}`));
  const toWrite = plan.filter((p) => p.status === 'rewrite');
  console.log(`[url-normalise] ${toWrite.length} rewrites; ${manual.length} need a manual decision`);
  if (!apply) { console.log('[url-normalise] dry run only — nothing written'); await finish(0); }

  writeBackupOnce(backupArg, JSON.stringify({
    takenAt: new Date().toISOString(),
    database: process.env.DB_NAME || 'local file',
    changes: toWrite.map((p) => ({ table: p.table, column: p.column, id: p.id, before: p.before, after: p.after })),
  }, null, 2));
  let written = 0; let skipped = 0;
  for (const p of toWrite) {
    const [res] = await db.execute(`UPDATE ${p.table} SET ${p.column} = ? WHERE id = ? AND ${p.column} = ?`, [p.after, p.id, p.before]);
    if ((res.affectedRows ?? res.changes) === 1) written++; else skipped++;
  }
  console.log(`[url-normalise] wrote ${written}; skipped ${skipped} (changed since read). backup: ${backupArg}`);
  await finish(0);
}

module.exports = { normaliseUrl, planUrlNormalise, loadRows, summarise, TARGETS };
if (require.main === module) main().catch(async (e) => { console.error('[url-normalise] failed:', e.message); await closeDb(); process.exit(e.exitCode || 1); });
