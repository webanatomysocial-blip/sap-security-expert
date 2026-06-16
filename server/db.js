const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const isSQLite = process.env.DB_CONNECTION === 'sqlite';

// ── SQLite support ────────────────────────────────────────────────────────────

/**
 * Translate MySQL-flavoured SQL into SQLite-compatible SQL.
 * Handles: DATE_ADD/DATE_SUB, NOW(), CURRENT_DATE, INSERT IGNORE,
 *          ON DUPLICATE KEY UPDATE, and empty-string literals.
 */
function translateSQL(sql) {
  return sql
    // DATE_ADD(NOW(), INTERVAL N UNIT) → datetime('now', '+N units')
    .replace(
      /DATE_ADD\s*\(\s*NOW\s*\(\s*\)\s*,\s*INTERVAL\s+(\d+)\s+(\w+)\s*\)/gi,
      (_, n, u) => `datetime('now', '+${n} ${u.toLowerCase()}s')`
    )
    // DATE_SUB(NOW(), INTERVAL N UNIT) → datetime('now', '-N units')
    .replace(
      /DATE_SUB\s*\(\s*NOW\s*\(\s*\)\s*,\s*INTERVAL\s+(\d+)\s+(\w+)\s*\)/gi,
      (_, n, u) => `datetime('now', '-${n} ${u.toLowerCase()}s')`
    )
    // NOW() → datetime('now')
    .replace(/\bNOW\s*\(\s*\)/gi, "datetime('now')")
    // CURRENT_DATE (bare keyword) → date('now')
    .replace(/\bCURRENT_DATE\b/g, "date('now')")
    // Empty-string literal using double-quotes ("") → SQLite string ('')
    .replace(/""/g, "''")
    // INSERT IGNORE → INSERT OR IGNORE
    .replace(/\bINSERT\s+IGNORE\b/gi, 'INSERT OR IGNORE')
    // INSERT ... ON DUPLICATE KEY UPDATE → INSERT OR REPLACE (strips the UPDATE clause)
    .replace(/\bINSERT\b(?=[\s\S]*?\bON\s+DUPLICATE\s+KEY\s+UPDATE\b)/gi, 'INSERT OR REPLACE')
    .replace(/\s+ON\s+DUPLICATE\s+KEY\s+UPDATE\b[\s\S]*/gi, '');
}

/**
 * Async adapter around better-sqlite3 that matches the mysql2 connection API
 * used throughout the routes: execute(), beginTransaction(), commit(), rollback(), release().
 */
class SQLiteAdapter {
  constructor(db) {
    this._db = db;
    this._inTx = false;
  }

  async execute(sql, params = []) {
    sql = translateSQL(sql.trim());
    const upper = sql.toUpperCase();
    const isRead = upper.startsWith('SELECT') || upper.startsWith('WITH') || upper.startsWith('PRAGMA');

    try {
      const stmt = this._db.prepare(sql);
      if (isRead) {
        // .all() returns an array of row objects — same shape as mysql2
        const rows = stmt.all(...(params || []));
        return [rows];
      } else {
        const result = stmt.run(...(params || []));
        // Mirror mysql2's OkPacket shape so code using result.insertId works
        return [{ insertId: result.lastInsertRowid, affectedRows: result.changes }];
      }
    } catch (err) {
      console.error('[SQLite] Error:', err.message);
      console.error('  SQL:', sql.slice(0, 300));
      console.error('  Params:', params);
      throw err;
    }
  }

  async beginTransaction() {
    this._db.prepare('BEGIN').run();
    this._inTx = true;
  }

  async commit() {
    this._db.prepare('COMMIT').run();
    this._inTx = false;
  }

  async rollback() {
    if (this._inTx) {
      try { this._db.prepare('ROLLBACK').run(); } catch { /* already rolled back */ }
      this._inTx = false;
    }
  }

  release() { /* no-op — SQLite uses a single shared connection */ }

  get inTransaction() { return this._inTx; }
}

// ── Connection setup ──────────────────────────────────────────────────────────

let pool = null;
let sqliteDb = null;
let sqliteAdapter = null;

if (isSQLite) {
  const Database = require('better-sqlite3');
  const dbPath = path.join(__dirname, 'database.sqlite');
  sqliteDb = new Database(dbPath);
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('foreign_keys = ON');
  sqliteAdapter = new SQLiteAdapter(sqliteDb);
  console.log('[DB] Using SQLite →', dbPath);

  // Ensure all required columns exist (idempotent — safe to run on every startup)
  const blogsColumns = [
    { name: 'secondary_categories',       def: "TEXT DEFAULT '[]'" },
    { name: 'draft_secondary_categories', def: "TEXT DEFAULT '[]'" },
    { name: 'image_alt',                  def: "TEXT DEFAULT ''"   },
    { name: 'draft_image_alt',            def: "TEXT DEFAULT ''"   },
    { name: 'co_authors',                 def: "TEXT DEFAULT '[]'" },
    { name: 'type',                       def: "VARCHAR(20) NOT NULL DEFAULT 'blog'" },
    { name: 'is_premium',                 def: "TINYINT NOT NULL DEFAULT 0" },
  ];
  const existing = sqliteDb.prepare("PRAGMA table_info(blogs)").all().map(r => r.name);
  for (const col of blogsColumns) {
    if (!existing.includes(col.name)) {
      sqliteDb.prepare(`ALTER TABLE blogs ADD COLUMN ${col.name} ${col.def}`).run();
      console.log(`[DB] Migration: added blogs.${col.name}`);
    }
  }

  // membership_plans table
  sqliteDb.prepare(`
    CREATE TABLE IF NOT EXISTS membership_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price_paise INTEGER NOT NULL,
      duration_days INTEGER NOT NULL DEFAULT 30,
      description TEXT DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Seed the default ₹1/month plan if no plans exist
  const planCount = sqliteDb.prepare('SELECT COUNT(*) as c FROM membership_plans').get();
  if (planCount.c === 0) {
    sqliteDb.prepare(
      "INSERT INTO membership_plans (name, price_paise, duration_days, description) VALUES (?, ?, ?, ?)"
    ).run('Monthly Premium', 100, 30, 'Full access to all premium SAP Security articles for 30 days');
    console.log('[DB] Seeded default membership plan (₹1/month)');
  }

  // member_subscriptions table
  sqliteDb.prepare(`
    CREATE TABLE IF NOT EXISTS member_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      plan_id INTEGER NOT NULL,
      razorpay_order_id TEXT,
      razorpay_payment_id TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      starts_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES membership_plans(id)
    )
  `).run();
  sqliteDb.prepare('CREATE INDEX IF NOT EXISTS idx_sub_member ON member_subscriptions(member_id)').run();

  const annColumns = [
    { name: 'slug',       def: "TEXT DEFAULT ''" },
    { name: 'content',    def: "TEXT DEFAULT ''" },
    { name: 'excerpt',    def: "TEXT DEFAULT ''" },
    { name: 'image',      def: "TEXT DEFAULT ''" },
    { name: 'image_alt',  def: "TEXT DEFAULT ''" },
    { name: 'updated_at', def: "DATETIME"         },
  ];
  const annExisting = sqliteDb.prepare("PRAGMA table_info(announcements)").all().map(r => r.name);
  for (const col of annColumns) {
    if (!annExisting.includes(col.name)) {
      sqliteDb.prepare(`ALTER TABLE announcements ADD COLUMN ${col.name} ${col.def}`).run();
      console.log(`[DB] Migration: added announcements.${col.name}`);
    }
  }
} else {
  const mysql = require('mysql2/promise');
  const dbHost = process.env.DB_HOST || '127.0.0.1';
  pool = mysql.createPool({
    host: dbHost === 'localhost' ? '127.0.0.1' : dbHost,
    user: process.env.DB_USER || '',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || '',
    charset: process.env.DB_CHARSET || 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+00:00',
  });
  console.log('[DB] Using MySQL →', dbHost === 'localhost' ? '127.0.0.1' : dbHost, '/', process.env.DB_NAME);
}

// ── Auto-publish hook ─────────────────────────────────────────────────────────
// Runs at most once per 60 s — transitions scheduled items to published/active.
let lastAutoPublish = 0;
async function runAutoPublish(conn) {
  const now = Date.now();
  if (now - lastAutoPublish < 60000) return;
  lastAutoPublish = now;
  const nowUtc = new Date().toISOString().slice(0, 19).replace('T', ' ');
  try {
    await conn.execute(
      "UPDATE blogs SET status = 'published' WHERE status = 'scheduled' AND publish_date <= ?",
      [nowUtc]
    );
    await conn.execute(
      "UPDATE announcements SET status = 'active' WHERE status = 'scheduled' AND publish_date <= ?",
      [nowUtc]
    );
  } catch { /* fail silently */ }
}

// ── Express middleware ────────────────────────────────────────────────────────
async function dbMiddleware(req, res, next) {
  try {
    let conn;
    if (isSQLite) {
      // SQLite: reuse the single shared adapter; release() is a no-op
      conn = sqliteAdapter;
    } else {
      conn = await pool.getConnection();
      res.on('finish', () => conn.release());
      res.on('close', () => conn.release());
    }
    req.db = conn;
    runAutoPublish(conn).catch(() => {});
    next();
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Database connection failed: ' + err.message });
  }
}

module.exports = { pool, dbMiddleware, isSQLite };
