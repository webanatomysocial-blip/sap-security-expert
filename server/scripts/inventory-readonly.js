// READ-ONLY inventory for the pending migrations. Prints counts only; never writes.
//
//   node scripts/inventory-readonly.js
//
// Uses the same pure planners as the migration scripts, so the counts match what each dry run
// would report. The session is set to READ ONLY and every statement is a SELECT. Connect with a
// database user that has SELECT privilege only.
'use strict';
const path = require('path');
const { openMigrationDb } = require('./lib/migration-db');
const { findFileBlocks } = require('../utils/fileOwnership');
const { planBackfill } = require('./migrate-file-ownership');
const { loadRows: loadUrlRows, planUrlNormalise, summarise } = require('./migrate-url-normalise');
const { planSanitise } = require('./migrate-news-learnings-sanitise');

async function main() {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  const { db, isSQLite, close } = await openMigrationDb();
  const out = {};
  try {
    if (!isSQLite) await db.query('SET SESSION TRANSACTION READ ONLY');
    console.log(`[inventory] database: ${process.env.DB_CONNECTION || 'sqlite'} / ${process.env.DB_NAME || 'local file'} (read-only session)`);

    const [[{ n: totalPosts }]] = await db.execute('SELECT COUNT(*) AS n FROM blogs');
    const [byStatus] = await db.execute('SELECT status, COUNT(*) AS n FROM blogs GROUP BY status');
    out.posts = { total: totalPosts, byStatus: Object.fromEntries(byStatus.map((r) => [r.status, Number(r.n)])) };

    // Files: same scope as the backfill (non-trash posts, body and draft).
    const [blogs] = await db.execute("SELECT id, author_id, created_at, status, content, draft_content FROM blogs WHERE status <> 'trash'");
    const embedPosts = new Map();
    for (const b of blogs) {
      for (const html of [b.content, b.draft_content]) {
        for (const blk of findFileBlocks(html || '')) {
          if (!embedPosts.has(blk.url)) embedPosts.set(blk.url, new Set());
          embedPosts.get(blk.url).add(String(b.id));
        }
      }
    }
    const [[{ n: ownerTables }]] = await db.execute(
      "SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'file_ownership'"
    );
    let owned = new Set();
    if (Number(ownerTables) === 1) {
      const [rows] = await db.execute('SELECT file_url FROM file_ownership');
      owned = new Set(rows.map((r) => r.file_url));
    }
    const unowned = [...embedPosts.keys()].filter((u) => !owned.has(u));
    const plan = planBackfill(blogs, owned);
    const shared = [...embedPosts.values()].filter((s) => s.size > 1).length;
    out.files = {
      distinctEmbeddedFiles: embedPosts.size,
      ownershipTablePresent: Number(ownerTables) === 1,
      withoutOwnerRow: unowned.length,
      sharedAcrossPosts: shared,
      ambiguousNeedingReview: plan.filter((p) => p.needsReview).length,
      ambiguousReasons: plan.filter((p) => p.needsReview).reduce((acc, p) => { acc[p.reason] = (acc[p.reason] || 0) + 1; return acc; }, {}),
    };

    // URLs (CTA, profile, ad, announcement) under the same rules as migrate-url-normalise.
    const urlPlan = planUrlNormalise(await loadUrlRows(db));
    out.urls = Object.fromEntries([...summarise(urlPlan)].map(([k, v]) => [k, v]));
    out.urlsNeedingManualDecision = urlPlan.filter((p) => p.status === 'manual').length;

    // News and learnings (same planner as migrate-news-learnings-sanitise).
    const [nl] = await db.execute("SELECT id, type, content, draft_content, faqs, draft_faqs FROM blogs WHERE `type` IN ('news','learning')");
    const changes = planSanitise(nl);
    const byField = {};
    for (const c of changes) byField[c.field] = (byField[c.field] || 0) + 1;
    const invalidFaq = nl.filter((r) => {
      for (const f of ['faqs', 'draft_faqs']) {
        const v = r[f];
        if (!v) continue;
        try { if (!Array.isArray(JSON.parse(v))) return true; } catch { return true; }
      }
      return false;
    }).length;
    out.newsLearnings = { rows: nl.length, fieldsNeedingSanitise: byField, rowsWithNonArrayFaqJson: invalidFaq };
    console.log(JSON.stringify(out, null, 2));
  } finally {
    await close();
  }
}

main().catch(async (e) => { console.error('[inventory] failed:', e.message); process.exit(1); });
