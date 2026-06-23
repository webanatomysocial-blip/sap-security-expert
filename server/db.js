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
    { name: 'is_members_only',            def: "TINYINT NOT NULL DEFAULT 0" },
    { name: 'is_premium',                 def: "TINYINT NOT NULL DEFAULT 0" },
    { name: 'is_queued_for_members',      def: "TINYINT DEFAULT 0" },
    { name: 'schema_type',                def: "TEXT DEFAULT 'Article'" },
    { name: 'article_section',            def: "TEXT DEFAULT NULL" },
    { name: 'send_notification_email',    def: "TINYINT DEFAULT 0" },
    { name: 'credits_required',            def: "INTEGER NOT NULL DEFAULT 0" },
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

  // Repair stale FK: fix-pk migration may have renamed members → _fix_members,
  // causing member_subscriptions to reference the now-dropped temp table.
  const subSql = sqliteDb.prepare("SELECT sql FROM sqlite_master WHERE name='member_subscriptions'").get()?.sql || '';
  if (subSql.includes('_fix_members')) {
    sqliteDb.pragma('foreign_keys = OFF');
    sqliteDb.prepare('ALTER TABLE member_subscriptions RENAME TO _stale_member_subscriptions').run();
    sqliteDb.prepare(`CREATE TABLE member_subscriptions (
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
    )`).run();
    sqliteDb.prepare('INSERT INTO member_subscriptions SELECT * FROM _stale_member_subscriptions').run();
    sqliteDb.prepare('DROP TABLE _stale_member_subscriptions').run();
    sqliteDb.pragma('foreign_keys = ON');
    console.log('[DB] Migration: repaired member_subscriptions FK reference');
  }

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

  // members table — columns added after the original SQL dump
  const membersColumns = [
    { name: 'username',   def: "TEXT DEFAULT NULL" },
    { name: 'is_deleted', def: "INTEGER DEFAULT 0" },
  ];
  const membersExisting = sqliteDb.prepare("PRAGMA table_info(members)").all().map(r => r.name);
  for (const col of membersColumns) {
    if (!membersExisting.includes(col.name)) {
      sqliteDb.prepare(`ALTER TABLE members ADD COLUMN ${col.name} ${col.def}`).run();
      console.log(`[DB] Migration: added members.${col.name}`);
    }
  }

  // contributors table — columns added after the original SQL dump
  const contribColumns = [
    { name: 'is_deleted',                   def: "INTEGER DEFAULT 0" },
    { name: 'deleted_at',                   def: "DATETIME DEFAULT NULL" },
    { name: 'deletion_ip',                  def: "TEXT DEFAULT NULL" },
    { name: 'deletion_method',              def: "TEXT DEFAULT NULL" },
    { name: 'deletion_confirmation_method', def: "TEXT DEFAULT NULL" },
  ];
  const contribExisting = sqliteDb.prepare("PRAGMA table_info(contributors)").all().map(r => r.name);
  for (const col of contribColumns) {
    if (!contribExisting.includes(col.name)) {
      sqliteDb.prepare(`ALTER TABLE contributors ADD COLUMN ${col.name} ${col.def}`).run();
      console.log(`[DB] Migration: added contributors.${col.name}`);
    }
  }

  // members table — additional columns
  const membersColumns2 = [
    { name: 'receive_blog_emails',          def: "INTEGER NOT NULL DEFAULT 1" },
    { name: 'updated_at',                   def: "DATETIME DEFAULT NULL" },
    { name: 'deleted_at',                   def: "DATETIME DEFAULT NULL" },
    { name: 'deletion_ip',                  def: "TEXT DEFAULT NULL" },
    { name: 'deletion_method',              def: "TEXT DEFAULT NULL" },
    { name: 'deletion_confirmation_method', def: "TEXT DEFAULT NULL" },
  ];
  const membersExisting2 = sqliteDb.prepare("PRAGMA table_info(members)").all().map(r => r.name);
  for (const col of membersColumns2) {
    if (!membersExisting2.includes(col.name)) {
      sqliteDb.prepare(`ALTER TABLE members ADD COLUMN ${col.name} ${col.def}`).run();
      console.log(`[DB] Migration: added members.${col.name}`);
    }
  }

  // users table — soft-delete columns
  const usersColumns = [
    { name: 'is_deleted',                   def: "INTEGER DEFAULT 0" },
    { name: 'deleted_at',                   def: "DATETIME DEFAULT NULL" },
    { name: 'deletion_ip',                  def: "TEXT DEFAULT NULL" },
    { name: 'deletion_method',              def: "TEXT DEFAULT NULL" },
    { name: 'deletion_confirmation_method', def: "TEXT DEFAULT NULL" },
  ];
  const usersExisting = sqliteDb.prepare("PRAGMA table_info(users)").all().map(r => r.name);
  for (const col of usersColumns) {
    if (!usersExisting.includes(col.name)) {
      sqliteDb.prepare(`ALTER TABLE users ADD COLUMN ${col.name} ${col.def}`).run();
      console.log(`[DB] Migration: added users.${col.name}`);
    }
  }

  // user_permissions — premium article access column
  const upExisting = sqliteDb.prepare("PRAGMA table_info(user_permissions)").all().map(r => r.name);
  if (!upExisting.includes('can_access_premium_articles')) {
    sqliteDb.prepare("ALTER TABLE user_permissions ADD COLUMN can_access_premium_articles INT NOT NULL DEFAULT 0").run();
    console.log('[DB] Migration: added user_permissions.can_access_premium_articles');
  }

  // verification_codes table (used by OTPService for email verification / password reset)
  sqliteDb.prepare(`
    CREATE TABLE IF NOT EXISTS verification_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'signup',
      ip_address TEXT DEFAULT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  sqliteDb.prepare('CREATE INDEX IF NOT EXISTS idx_vc_email_type ON verification_codes(email, type)').run();

  // password_reset_tokens table (used by otp.js for token-based password reset)
  sqliteDb.prepare(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      token TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  sqliteDb.prepare('CREATE INDEX IF NOT EXISTS idx_prt_email ON password_reset_tokens(email)').run();

  // ── Credit system tables ──────────────────────────────────────────────────────

  sqliteDb.prepare(`
    CREATE TABLE IF NOT EXISTS credit_bundles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      credits INTEGER NOT NULL,
      price_paise INTEGER NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  sqliteDb.prepare(`
    CREATE TABLE IF NOT EXISTS member_credits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL UNIQUE,
      balance INTEGER NOT NULL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  sqliteDb.prepare(`
    CREATE TABLE IF NOT EXISTS credit_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      credits_delta INTEGER NOT NULL,
      amount_paise INTEGER DEFAULT 0,
      note TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  sqliteDb.prepare('CREATE INDEX IF NOT EXISTS idx_ctx_member ON credit_transactions(member_id)').run();
  // Add razorpay_order_id for replay prevention (ignore if column already exists)
  try { sqliteDb.prepare('ALTER TABLE credit_transactions ADD COLUMN razorpay_order_id TEXT').run(); } catch {}
  try { sqliteDb.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_ctx_order ON credit_transactions(razorpay_order_id) WHERE razorpay_order_id IS NOT NULL').run(); } catch {}

  sqliteDb.prepare(`
    CREATE TABLE IF NOT EXISTS payment_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      razorpay_order_id TEXT NOT NULL UNIQUE,
      member_id INTEGER NOT NULL,
      bundle_id INTEGER NOT NULL,
      bundle_credits INTEGER NOT NULL,
      bundle_price_paise INTEGER NOT NULL,
      coupon_id INTEGER DEFAULT NULL,
      final_price_paise INTEGER NOT NULL,
      fulfilled INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  sqliteDb.prepare(`
    CREATE TABLE IF NOT EXISTS member_blog_unlocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      blog_slug TEXT NOT NULL,
      credits_spent INTEGER NOT NULL DEFAULT 0,
      unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(member_id, blog_slug)
    )
  `).run();
  sqliteDb.prepare('CREATE INDEX IF NOT EXISTS idx_unlock_member ON member_blog_unlocks(member_id)').run();

  sqliteDb.prepare(`
    CREATE TABLE IF NOT EXISTS post_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id TEXT NOT NULL,
      visitor_token TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  sqliteDb.prepare('CREATE INDEX IF NOT EXISTS idx_pv_post ON post_views(post_id)').run();
  sqliteDb.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_pv_dedup ON post_views(post_id, visitor_token)').run();

  sqliteDb.prepare(`
    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      discount_type TEXT NOT NULL DEFAULT 'percentage',
      discount_value INTEGER NOT NULL DEFAULT 0,
      max_uses INTEGER NOT NULL DEFAULT 0,
      used_count INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      expires_at DATETIME DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

} else {
  const mysql = require('mysql2/promise');
  const dbHost = process.env.DB_HOST || 'localhost';
  pool = mysql.createPool({
    host: dbHost,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || '',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || '',
    charset: process.env.DB_CHARSET || 'utf8mb4',
    waitForConnections: true,
    // Lightsail 1 GB: session store uses 2 connections, so 3 here = 5 total.
    // Each idle connection holds ~4–8 MB of socket/buffer memory.
    // Override with DB_POOL_SIZE if you need more throughput.
    connectionLimit: parseInt(process.env.DB_POOL_SIZE || '3'),
    queueLimit: 50,
    timezone: '+00:00',
    // Reconnect automatically if the Hostinger MySQL server closes idle connections.
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  });
  console.log('[DB] Using MySQL →', dbHost, '/', process.env.DB_NAME);
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
      let released = false;
      const safeRelease = () => {
        if (!released) {
          released = true;
          conn.release();
        }
      };
      res.on('finish', safeRelease);
      res.on('close', safeRelease);
    }
    req.db = conn;
    runAutoPublish(conn).catch(() => {});
    next();
  } catch (err) {
    const isHealthCheck = req.path === '/api/health' || req.path === '/health' || req.originalUrl === '/api/health';
    if (isHealthCheck) {
      req.dbError = err;
      return next();
    }
    res.status(500).json({ status: 'error', message: 'Database connection failed: ' + err.message });
  }
}

module.exports = { pool, dbMiddleware, isSQLite };
