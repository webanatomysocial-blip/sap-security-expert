// PREPARED. Backfills permanent file ownership from existing posts.
// Default: dry run (read-only). Applying needs:
//   --apply --backup=<existing non-empty database dump> --confirm=I_HAVE_A_BACKUP
// Creates the tables if missing (same DDL as migrations/2026-11-05_file_ownership.mysql.sql,
// SQLite flavour below), then inserts one owner row per file that has none.
'use strict';
const fs = require('fs');
const path = require('path');
const { openMigrationDb } = require('./lib/migration-db');
const { findFileBlocks } = require('../utils/fileOwnership');

const SQLITE_DDL = [
  `CREATE TABLE IF NOT EXISTS file_ownership (file_url TEXT PRIMARY KEY, owner_user_id INTEGER NOT NULL, price_credits INTEGER NOT NULL DEFAULT 0, source TEXT NOT NULL DEFAULT 'upload', needs_review INTEGER NOT NULL DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME NULL)`,
  `CREATE TABLE IF NOT EXISTS file_ownership_audit (id INTEGER PRIMARY KEY AUTOINCREMENT, file_url TEXT NOT NULL, action TEXT NOT NULL, actor_user_id INTEGER NULL, old_price INTEGER NULL, new_price INTEGER NULL, reason TEXT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
];

// Pure: decide an owner for every file embedded in the given posts.
// Owner = earliest live post that embeds the file (created_at, then id), else earliest of any.
// needsReview when: no live embed, several authors embed it, or the embedded prices disagree.
function planBackfill(blogs, alreadyOwned = new Set()) {
  const embeds = new Map(); // url -> [{blogId, authorId, created, credits, live}]
  // MySQL/MariaDB drivers return DATETIME as Date objects; String(Date) sorts by weekday name,
  // so compare epoch milliseconds instead (strings from SQLite are UTC "YYYY-MM-DD HH:MM:SS").
  const toMs = (v) => (v instanceof Date ? v.getTime() : Date.parse(String(v).replace(' ', 'T') + 'Z'));
  const ordered = [...blogs].sort((a, b) => (toMs(a.created_at) - toMs(b.created_at)) || String(a.id).localeCompare(String(b.id)));
  for (const b of ordered) {
    const live = ['approved', 'published'].includes(b.status);
    for (const html of [b.content, b.draft_content]) {
      for (const blk of findFileBlocks(html || '')) {
        if (alreadyOwned.has(blk.url)) continue;
        if (!embeds.has(blk.url)) embeds.set(blk.url, []);
        embeds.get(blk.url).push({ blogId: b.id, authorId: b.author_id, created: b.created_at, credits: blk.credits, live: live && html === b.content });
      }
    }
  }
  const plan = [];
  for (const [url, list] of embeds) {
    const liveList = list.filter((e) => e.live);
    const first = (liveList.length ? liveList : list)[0];
    const authors = new Set(list.map((e) => String(e.authorId)));
    const prices = new Set(list.map((e) => (e.credits === null ? 'null' : String(e.credits))));
    const reasons = [];
    if (!liveList.length) reasons.push('no live embed');
    if (authors.size > 1) reasons.push(`${authors.size} authors embed it`);
    if (prices.size > 1) reasons.push('embedded prices differ');
    plan.push({
      fileUrl: url, ownerUserId: Number(first.authorId), price: first.credits ?? 0,
      needsReview: reasons.length > 0, reason: reasons.join('; ') || 'single owner', sourceBlogId: first.blogId,
    });
  }
  return plan;
}

async function ensureTables(db) {
  for (const sql of SQLITE_DDL) await db.execute(sql);
}

async function existingOwnedFiles(db) {
  const [rows] = await db.execute('SELECT file_url FROM file_ownership');
  return new Set(rows.map((r) => r.file_url));
}

async function applyPlan(db, plan) {
  let inserted = 0;
  for (const p of plan) {
    const [[row]] = await db.execute('SELECT file_url FROM file_ownership WHERE file_url = ? LIMIT 1', [p.fileUrl]);
    if (row) continue; // idempotent
    await db.execute(
      'INSERT INTO file_ownership (file_url, owner_user_id, price_credits, source, needs_review) VALUES (?, ?, ?, ?, ?)',
      [p.fileUrl, p.ownerUserId, p.price, 'backfill', p.needsReview ? 1 : 0]
    );
    await db.execute(
      'INSERT INTO file_ownership_audit (file_url, action, actor_user_id, old_price, new_price, reason) VALUES (?, ?, NULL, NULL, ?, ?)',
      [p.fileUrl, 'backfill', p.price, `${p.reason} (post ${p.sourceBlogId})`]
    );
    inserted++;
  }
  return inserted;
}

let closeDb = async () => {};
async function finish(code) { await closeDb(); process.exit(code); }

async function main() {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const backupArg = (args.find((a) => a.startsWith('--backup=')) || '').slice('--backup='.length);
  const confirmed = args.includes('--confirm=I_HAVE_A_BACKUP');
  const { db, isSQLite, close } = await openMigrationDb();
  closeDb = close;
  console.log(`[ownership-backfill] target: ${process.env.DB_CONNECTION || 'sqlite'} / ${process.env.DB_NAME || 'local file'}`);
  if (apply && (!backupArg || !confirmed)) { console.error('[ownership-backfill] refusing to apply: needs --backup=<file> and --confirm=I_HAVE_A_BACKUP'); await finish(2); }
  // The backup must be a full database dump taken BEFORE applying (e.g. mariadb-dump / mysqldump
  // --single-transaction of blogs, file_ownership and file_ownership_audit). The script does not
  // write its own snapshot: a list of URLs cannot restore a database.
  if (apply && !(fs.existsSync(backupArg) && fs.statSync(backupArg).size > 0)) { console.error(`[ownership-backfill] refusing to apply: backup file missing or empty: ${backupArg}`); await finish(2); }
  const [blogs] = await db.execute("SELECT id, author_id, created_at, status, content, draft_content FROM blogs WHERE status <> 'trash'");
  const owned = await existingOwnedFiles(db).catch(() => new Set());
  const plan = planBackfill(blogs, owned);
  const review = plan.filter((p) => p.needsReview).length;
  console.log(`[ownership-backfill] ${plan.length} files without an owner (${review} flagged for review)`);
  plan.slice(0, 20).forEach((p) => console.log(`  ${p.fileUrl}  owner=${p.ownerUserId}  price=${p.price}  ${p.needsReview ? 'REVIEW: ' + p.reason : 'ok'}`));
  if (!apply) { console.log('[ownership-backfill] dry run only — nothing written'); await finish(0); }
  if (!isSQLite) { /* MySQL: tables must already exist from the .mysql.sql migration */ } else { await ensureTables(db); }
  const inserted = await applyPlan(db, plan);
  console.log(`[ownership-backfill] inserted ${inserted} owner rows (backup: ${backupArg})`);
  await finish(0);
}

module.exports = { planBackfill, applyPlan, ensureTables };
if (require.main === module) main().catch(async (e) => { console.error('[ownership-backfill] failed:', e.message); await closeDb(); process.exit(e.exitCode || 1); });
