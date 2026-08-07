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

  // MySQL pool connections have getConnection(); mirror it so transaction controllers
  // that call db.getConnection() work in SQLite dev mode without code changes.
  async getConnection() { return this; }

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
    { name: 'homepage_featured_image',     def: "TEXT DEFAULT NULL"  },
    { name: 'homepage_featured_order',     def: "INTEGER DEFAULT NULL" },
    { name: 'badge_expert_reviewed',       def: "INTEGER NOT NULL DEFAULT 0" },
    { name: 'badge_sap_notes_verified',    def: "INTEGER NOT NULL DEFAULT 0" },
    { name: 'badge_tested_s4hana',         def: "INTEGER NOT NULL DEFAULT 0" },
    { name: 'badge_field_validated',       def: "INTEGER NOT NULL DEFAULT 0" },
    { name: 'difficulty_level',            def: "TEXT DEFAULT NULL" },
    { name: 'content_version',             def: "TEXT NOT NULL DEFAULT '1.0'" },
    { name: 'preview_paragraphs',          def: "INTEGER DEFAULT NULL" },
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
    { name: 'sap_certifications',           def: "TEXT DEFAULT NULL" },
    { name: 'sap_press_books',              def: "TEXT DEFAULT NULL" },
    { name: 'implementations_count',        def: "INTEGER DEFAULT NULL" },
    { name: 'peer_rating',                  def: "REAL DEFAULT NULL" },
    { name: 'peer_rating_count',            def: "INTEGER DEFAULT 0" },
    { name: 'experience_years',             def: "INTEGER DEFAULT NULL" },
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

  // members table — referral columns
  const membersColumns3 = [
    { name: 'referral_code',    def: "TEXT DEFAULT NULL" },
    { name: 'referred_by_code', def: "TEXT DEFAULT NULL" },
  ];
  const membersExisting3 = sqliteDb.prepare("PRAGMA table_info(members)").all().map(r => r.name);
  for (const col of membersColumns3) {
    if (!membersExisting3.includes(col.name)) {
      sqliteDb.prepare(`ALTER TABLE members ADD COLUMN ${col.name} ${col.def}`).run();
      console.log(`[DB] Migration: added members.${col.name}`);
    }
  }

  // users table — soft-delete columns
  const usersColumns = [
    { name: 'full_name',                    def: "TEXT DEFAULT NULL" },
    { name: 'bio',                          def: "TEXT DEFAULT NULL" },
    { name: 'designation',                  def: "TEXT DEFAULT NULL" },
    { name: 'linkedin',                     def: "TEXT DEFAULT NULL" },
    { name: 'twitter_handle',              def: "TEXT DEFAULT NULL" },
    { name: 'personal_website',            def: "TEXT DEFAULT NULL" },
    { name: 'profile_image',               def: "TEXT DEFAULT NULL" },
    { name: 'is_active',                    def: "INTEGER NOT NULL DEFAULT 1" },
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
  // Add razorpay_refund_id so refund webhooks can be safely retried without double-reversing credits
  try { sqliteDb.prepare('ALTER TABLE credit_transactions ADD COLUMN razorpay_refund_id TEXT').run(); } catch {}
  try { sqliteDb.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_ctx_refund ON credit_transactions(razorpay_refund_id) WHERE razorpay_refund_id IS NOT NULL').run(); } catch {}

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
    CREATE TABLE IF NOT EXISTS member_file_downloads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      file_url TEXT NOT NULL,
      original_name TEXT DEFAULT NULL,
      credits_spent INTEGER NOT NULL DEFAULT 0,
      downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(member_id, file_url)
    )
  `).run();
  sqliteDb.prepare('CREATE INDEX IF NOT EXISTS idx_dld_member ON member_file_downloads(member_id)').run();
  const dldCols = sqliteDb.prepare('PRAGMA table_info(member_file_downloads)').all().map(r => r.name);
  if (!dldCols.includes('original_name')) sqliteDb.prepare('ALTER TABLE member_file_downloads ADD COLUMN original_name TEXT DEFAULT NULL').run();

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

  sqliteDb.prepare(`
    CREATE TABLE IF NOT EXISTS credit_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      description TEXT DEFAULT '',
      credits INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  sqliteDb.prepare(`
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  sqliteDb.prepare("INSERT OR IGNORE INTO site_settings (key, value) VALUES ('paywall_default_preview_paragraphs', '3')").run();

  sqliteDb.prepare(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER DEFAULT NULL,
      actor       TEXT    DEFAULT NULL,
      action      TEXT    NOT NULL,
      target_type TEXT    DEFAULT NULL,
      target_id   TEXT    DEFAULT NULL,
      details     TEXT    DEFAULT NULL,
      ip          TEXT    DEFAULT NULL,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  // Migrate older audit_logs schema: add columns that didn't exist in the original table
  const auditCols = sqliteDb.prepare('PRAGMA table_info(audit_logs)').all().map(r => r.name);
  if (!auditCols.includes('actor'))      sqliteDb.prepare('ALTER TABLE audit_logs ADD COLUMN actor TEXT DEFAULT NULL').run();
  if (!auditCols.includes('ip'))         sqliteDb.prepare('ALTER TABLE audit_logs ADD COLUMN ip TEXT DEFAULT NULL').run();
  if (!auditCols.includes('created_at')) {
    // SQLite ALTER TABLE ADD COLUMN only accepts literal constants — CURRENT_TIMESTAMP not allowed
    sqliteDb.prepare('ALTER TABLE audit_logs ADD COLUMN created_at DATETIME DEFAULT NULL').run();
    // Backfill from old `timestamp` column if it exists
    if (auditCols.includes('timestamp')) {
      sqliteDb.prepare('UPDATE audit_logs SET created_at = [timestamp] WHERE created_at IS NULL AND [timestamp] IS NOT NULL').run();
    }
  }
  try { sqliteDb.prepare('CREATE INDEX IF NOT EXISTS idx_al_action ON audit_logs(action)').run(); } catch {}
  try { sqliteDb.prepare('CREATE INDEX IF NOT EXISTS idx_al_created_at ON audit_logs(created_at)').run(); } catch {}

  sqliteDb.prepare(`
    CREATE TABLE IF NOT EXISTS email_logs (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient     TEXT NOT NULL,
      subject       TEXT DEFAULT '',
      status        TEXT DEFAULT 'pending',
      error_message TEXT DEFAULT NULL,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  sqliteDb.prepare('CREATE INDEX IF NOT EXISTS idx_el_recipient ON email_logs(recipient)').run();

  sqliteDb.prepare(`
    CREATE TABLE IF NOT EXISTS email_queue (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient   TEXT NOT NULL,
      blog_id     TEXT DEFAULT NULL,
      subject     TEXT DEFAULT '',
      body        TEXT,
      status      TEXT DEFAULT 'pending',
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      sent_at     DATETIME DEFAULT NULL,
      UNIQUE(recipient, blog_id)
    )
  `).run();

  // Seed default activities (INSERT OR IGNORE so re-runs are safe)
  const defaultActivities = [
    ['new_registration',  'New Registration',                    'Credits awarded when a new member registers',              10],
    ['approved_comment',  'Approved Comment',                    'Credits awarded when a comment is approved',               2],
    ['referral',          'Referral (new member registers)',     'Credits awarded when a referred member joins',             2],
    ['article_published', 'Article Published (Community Author)','Credits awarded when a contributed article is published',  20],
    ['podcast_guest',     'Podcast Guest',                       'Credits awarded for appearing on the podcast',            20],
    ['error_report',      'Report an Error',                     'Credits awarded when a member reports an article error',   1],
    ['complete_profile',  'Complete Profile',                    'Credits awarded when a member completes their profile',    2],
    ['product_review',    'Submit a Product Review',             'Credits awarded when a member submits a product review',   5],
    ['linkedin_share',    'LinkedIn Share',                      'Credits awarded when a member shares on LinkedIn',         5],
  ];
  const insertAct = sqliteDb.prepare(
    "INSERT OR IGNORE INTO credit_activities (`key`, label, description, credits) VALUES (?, ?, ?, ?)"
  );
  for (const row of defaultActivities) insertAct.run(...row);

} else {
  const mysql = require('mysql2/promise');
  const dbHost = process.env.DB_HOST || 'localhost';

  // Auto-create tables that exist in the SQLite schema but may be missing from
  // older MySQL deployments. Each statement is idempotent (IF NOT EXISTS / INSERT IGNORE).
  // Runs once at startup; errors are logged but never crash the server.
  async function ensureMySQLTables() {
    let conn;
    try {
      const tmpPool = mysql.createPool({
        host: dbHost,
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || '',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || '',
        charset: process.env.DB_CHARSET || 'utf8mb4',
        connectionLimit: 1,
        timezone: '+00:00',
      });
      conn = await tmpPool.getConnection();

      await conn.execute(`
        CREATE TABLE IF NOT EXISTS credit_activities (
          id          INT          NOT NULL AUTO_INCREMENT,
          \`key\`     VARCHAR(100) NOT NULL,
          label       VARCHAR(255) NOT NULL,
          description TEXT         DEFAULT '',
          credits     INT          NOT NULL DEFAULT 1,
          is_active   TINYINT(1)   NOT NULL DEFAULT 1,
          created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_ca_key (\`key\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      const defaultActivities = [
        ['new_registration',  'New Registration',                    'Credits awarded when a new member registers',             10],
        ['approved_comment',  'Approved Comment',                    'Credits awarded when a comment is approved',              2],
        ['referral',          'Referral (new member registers)',     'Credits awarded when a referred member joins',            2],
        ['article_published', 'Article Published (Community Author)','Credits awarded when a contributed article is published', 20],
        ['podcast_guest',     'Podcast Guest',                       'Credits awarded for appearing on the podcast',           20],
        ['error_report',      'Report an Error',                     'Credits awarded when a member reports an article error',  1],
        ['complete_profile',  'Complete Profile',                    'Credits awarded when a member completes their profile',   2],
        ['product_review',    'Submit a Product Review',             'Credits awarded when a member submits a product review',  5],
        ['linkedin_share',    'LinkedIn Share',                      'Credits awarded when a member shares on LinkedIn',        5],
      ];
      for (const [key, label, description, credits] of defaultActivities) {
        await conn.execute(
          'INSERT IGNORE INTO credit_activities (`key`, label, description, credits) VALUES (?, ?, ?, ?)',
          [key, label, description, credits]
        );
      }

      await conn.execute(`
        CREATE TABLE IF NOT EXISTS site_settings (
          \`key\`      VARCHAR(100) NOT NULL,
          value        TEXT         NOT NULL,
          updated_at   DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`key\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      await conn.execute(
        "INSERT IGNORE INTO site_settings (`key`, value) VALUES ('paywall_default_preview_paragraphs', '3')"
      );

      await conn.execute(`
        CREATE TABLE IF NOT EXISTS member_file_downloads (
          id            INT          NOT NULL AUTO_INCREMENT,
          member_id     INT          NOT NULL,
          file_url      VARCHAR(500) NOT NULL,
          original_name VARCHAR(500) DEFAULT NULL,
          credits_spent INT          NOT NULL DEFAULT 0,
          downloaded_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_dld (member_id, file_url(191)),
          KEY idx_dld_member (member_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await conn.execute(`
        CREATE TABLE IF NOT EXISTS email_logs (
          id            INT          NOT NULL AUTO_INCREMENT,
          recipient     VARCHAR(255) NOT NULL,
          subject       VARCHAR(500) DEFAULT '',
          status        VARCHAR(20)  DEFAULT 'pending',
          error_message TEXT         DEFAULT NULL,
          created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_el_recipient (recipient),
          KEY idx_el_status    (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await conn.execute(`
        CREATE TABLE IF NOT EXISTS email_queue (
          id          INT           NOT NULL AUTO_INCREMENT,
          recipient   VARCHAR(255)  NOT NULL,
          blog_id     VARCHAR(100)  DEFAULT NULL,
          subject     VARCHAR(500)  DEFAULT '',
          body        LONGTEXT,
          status      VARCHAR(20)   DEFAULT 'pending',
          created_at  DATETIME      DEFAULT CURRENT_TIMESTAMP,
          sent_at     DATETIME      DEFAULT NULL,
          PRIMARY KEY (id),
          UNIQUE KEY idx_recipient_blog (recipient, blog_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await conn.execute(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id          INT          NOT NULL AUTO_INCREMENT,
          user_id     INT          DEFAULT NULL,
          actor       VARCHAR(100) DEFAULT NULL,
          action      VARCHAR(100) NOT NULL,
          target_type VARCHAR(100) DEFAULT NULL,
          target_id   VARCHAR(100) DEFAULT NULL,
          details     TEXT         DEFAULT NULL,
          ip          VARCHAR(45)  DEFAULT NULL,
          created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_al_user_id    (user_id),
          KEY idx_al_action     (action),
          KEY idx_al_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      // ── Column migration helper ───────────────────────────────────────────────
      // Uses INFORMATION_SCHEMA so it works on MySQL 5.7+, MySQL 8, and MariaDB.
      async function getColumns(table) {
        const [rows] = await conn.execute(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
          [table]
        );
        return rows.map(r => r.COLUMN_NAME);
      }
      async function addCol(table, col, def) {
        await conn.execute(`ALTER TABLE \`${table}\` ADD COLUMN \`${col}\` ${def}`).catch(() => {});
      }

      // ── audit_logs: add actor, ip, created_at (old schema only had timestamp) ──
      const auditCols = await getColumns('audit_logs');
      if (!auditCols.includes('actor'))      await addCol('audit_logs', 'actor',      'VARCHAR(100) DEFAULT NULL AFTER user_id');
      if (!auditCols.includes('ip'))         await addCol('audit_logs', 'ip',         'VARCHAR(45)  DEFAULT NULL AFTER details');
      if (!auditCols.includes('created_at')) {
        await addCol('audit_logs', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP AFTER ip');
        // Backfill from old `timestamp` column for existing rows
        if (auditCols.includes('timestamp')) {
          await conn.execute('UPDATE audit_logs SET created_at = `timestamp` WHERE created_at IS NULL').catch(() => {});
        }
      }

      // ── members: profile_visibility, full_name (referenced by public profile route) ──
      const memberCols = await getColumns('members');
      if (!memberCols.includes('profile_visibility')) await addCol('members', 'profile_visibility', "LONGTEXT DEFAULT NULL");
      if (!memberCols.includes('full_name'))          await addCol('members', 'full_name',          "VARCHAR(255) DEFAULT NULL");
      if (!memberCols.includes('referral_code'))      await addCol('members', 'referral_code',      "VARCHAR(20) DEFAULT NULL");
      if (!memberCols.includes('referred_by_code'))   await addCol('members', 'referred_by_code',   "VARCHAR(20) DEFAULT NULL");
      if (!memberCols.includes('username'))            await addCol('members', 'username',           "VARCHAR(255) DEFAULT NULL");
      if (!memberCols.includes('is_deleted'))          await addCol('members', 'is_deleted',         "TINYINT(1) NOT NULL DEFAULT 0");
      if (!memberCols.includes('receive_blog_emails')) await addCol('members', 'receive_blog_emails',"TINYINT(1) NOT NULL DEFAULT 1");
      if (!memberCols.includes('updated_at'))          await addCol('members', 'updated_at',         "DATETIME DEFAULT NULL");
      if (!memberCols.includes('deleted_at'))          await addCol('members', 'deleted_at',         "DATETIME DEFAULT NULL");
      if (!memberCols.includes('deletion_method'))     await addCol('members', 'deletion_method',    "VARCHAR(50) DEFAULT NULL");
      if (!memberCols.includes('deletion_ip'))         await addCol('members', 'deletion_ip',        "VARCHAR(45) DEFAULT NULL");
      if (!memberCols.includes('deletion_confirmation_method')) await addCol('members', 'deletion_confirmation_method', "VARCHAR(50) DEFAULT NULL");

      // ── blogs: all columns added after original schema ─────────────────────────
      const blogCols = await getColumns('blogs');
      if (!blogCols.includes('secondary_categories'))       await addCol('blogs', 'secondary_categories',       "LONGTEXT DEFAULT NULL");
      if (!blogCols.includes('draft_secondary_categories')) await addCol('blogs', 'draft_secondary_categories', "LONGTEXT DEFAULT NULL");
      if (!blogCols.includes('image_alt'))                  await addCol('blogs', 'image_alt',                  "VARCHAR(255) DEFAULT NULL");
      if (!blogCols.includes('draft_image_alt'))            await addCol('blogs', 'draft_image_alt',            "VARCHAR(255) DEFAULT NULL");
      if (!blogCols.includes('co_authors'))                 await addCol('blogs', 'co_authors',                 "TEXT DEFAULT NULL");
      if (!blogCols.includes('type'))                       await addCol('blogs', 'type',                       "VARCHAR(20) NOT NULL DEFAULT 'blog'");
      if (!blogCols.includes('is_members_only'))            await addCol('blogs', 'is_members_only',            "TINYINT(1) NOT NULL DEFAULT 0");
      if (!blogCols.includes('is_premium'))                 await addCol('blogs', 'is_premium',                 "TINYINT(1) NOT NULL DEFAULT 0");
      if (!blogCols.includes('is_queued_for_members'))      await addCol('blogs', 'is_queued_for_members',      "TINYINT(1) DEFAULT 0");
      if (!blogCols.includes('credits_required'))           await addCol('blogs', 'credits_required',           "INT NOT NULL DEFAULT 0");
      if (!blogCols.includes('preview_paragraphs'))         await addCol('blogs', 'preview_paragraphs',         "INT DEFAULT NULL");
      if (!blogCols.includes('schema_type'))                await addCol('blogs', 'schema_type',                "VARCHAR(100) DEFAULT 'Article'");
      if (!blogCols.includes('article_section'))            await addCol('blogs', 'article_section',            "VARCHAR(255) DEFAULT NULL");
      if (!blogCols.includes('send_notification_email'))    await addCol('blogs', 'send_notification_email',    "TINYINT(1) DEFAULT 0");
      if (!blogCols.includes('homepage_featured'))          await addCol('blogs', 'homepage_featured',          "TINYINT(1) DEFAULT 0");
      if (!blogCols.includes('homepage_featured_image'))    await addCol('blogs', 'homepage_featured_image',    "LONGTEXT DEFAULT NULL");
      if (!blogCols.includes('homepage_featured_order'))    await addCol('blogs', 'homepage_featured_order',    "INT DEFAULT NULL");
      if (!blogCols.includes('is_expert_pick'))             await addCol('blogs', 'is_expert_pick',             "TINYINT(1) NOT NULL DEFAULT 0");
      if (!blogCols.includes('badge_expert_reviewed'))      await addCol('blogs', 'badge_expert_reviewed',      "TINYINT(1) NOT NULL DEFAULT 0");
      if (!blogCols.includes('badge_sap_notes_verified'))   await addCol('blogs', 'badge_sap_notes_verified',   "TINYINT(1) NOT NULL DEFAULT 0");
      if (!blogCols.includes('badge_tested_s4hana'))        await addCol('blogs', 'badge_tested_s4hana',        "TINYINT(1) NOT NULL DEFAULT 0");
      if (!blogCols.includes('badge_field_validated'))      await addCol('blogs', 'badge_field_validated',      "TINYINT(1) NOT NULL DEFAULT 0");
      if (!blogCols.includes('difficulty_level'))           await addCol('blogs', 'difficulty_level',           "VARCHAR(50) DEFAULT NULL");
      if (!blogCols.includes('content_version'))            await addCol('blogs', 'content_version',            "VARCHAR(20) NOT NULL DEFAULT '1.0'");

      // ── contributors: columns added after original schema ─────────────────────
      const contCols = await getColumns('contributors');
      if (!contCols.includes('is_deleted'))                   await addCol('contributors', 'is_deleted',                   "TINYINT(1) DEFAULT 0");
      if (!contCols.includes('deleted_at'))                   await addCol('contributors', 'deleted_at',                   "DATETIME DEFAULT NULL");
      if (!contCols.includes('deletion_ip'))                  await addCol('contributors', 'deletion_ip',                  "VARCHAR(45) DEFAULT NULL");
      if (!contCols.includes('deletion_method'))              await addCol('contributors', 'deletion_method',              "VARCHAR(50) DEFAULT NULL");
      if (!contCols.includes('deletion_confirmation_method')) await addCol('contributors', 'deletion_confirmation_method', "VARCHAR(50) DEFAULT NULL");
      if (!contCols.includes('sap_certifications'))           await addCol('contributors', 'sap_certifications',           "TEXT DEFAULT NULL");
      if (!contCols.includes('sap_press_books'))              await addCol('contributors', 'sap_press_books',              "TEXT DEFAULT NULL");
      if (!contCols.includes('implementations_count'))        await addCol('contributors', 'implementations_count',        "INT DEFAULT 0");
      if (!contCols.includes('peer_rating'))                  await addCol('contributors', 'peer_rating',                  "DECIMAL(3,2) DEFAULT 0.00");
      if (!contCols.includes('peer_rating_count'))            await addCol('contributors', 'peer_rating_count',            "INT DEFAULT 0");
      if (!contCols.includes('experience_years'))             await addCol('contributors', 'experience_years',             "INT DEFAULT 0");

      // ── users: columns added after original schema ────────────────────────────
      const userCols = await getColumns('users');
      if (!userCols.includes('full_name'))                    await addCol('users', 'full_name',                    "LONGTEXT DEFAULT NULL");
      if (!userCols.includes('bio'))                          await addCol('users', 'bio',                          "LONGTEXT DEFAULT NULL");
      if (!userCols.includes('designation'))                  await addCol('users', 'designation',                  "LONGTEXT DEFAULT NULL");
      if (!userCols.includes('linkedin'))                     await addCol('users', 'linkedin',                     "LONGTEXT DEFAULT NULL");
      if (!userCols.includes('twitter_handle'))               await addCol('users', 'twitter_handle',               "LONGTEXT DEFAULT NULL");
      if (!userCols.includes('personal_website'))             await addCol('users', 'personal_website',             "LONGTEXT DEFAULT NULL");
      if (!userCols.includes('profile_image'))                await addCol('users', 'profile_image',                "VARCHAR(255) DEFAULT NULL");
      if (!userCols.includes('is_active'))                    await addCol('users', 'is_active',                    "INT NOT NULL DEFAULT 1");
      if (!userCols.includes('is_deleted'))                   await addCol('users', 'is_deleted',                   "TINYINT(1) DEFAULT 0");
      if (!userCols.includes('deleted_at'))                   await addCol('users', 'deleted_at',                   "DATETIME DEFAULT NULL");
      if (!userCols.includes('deletion_ip'))                  await addCol('users', 'deletion_ip',                  "VARCHAR(45) DEFAULT NULL");
      if (!userCols.includes('deletion_method'))              await addCol('users', 'deletion_method',              "VARCHAR(50) DEFAULT NULL");
      if (!userCols.includes('deletion_confirmation_method')) await addCol('users', 'deletion_confirmation_method', "VARCHAR(50) DEFAULT NULL");

      // ── user_permissions: premium article access ──────────────────────────────
      const upCols = await getColumns('user_permissions');
      if (!upCols.includes('can_review_blogs'))           await addCol('user_permissions', 'can_review_blogs',           "INT DEFAULT 0");
      if (!upCols.includes('can_access_premium_articles')) await addCol('user_permissions', 'can_access_premium_articles',"TINYINT(1) NOT NULL DEFAULT 0");

      // ── credit_transactions: refund column ───────────────────────────────────
      const ctCols = await getColumns('credit_transactions');
      if (!ctCols.includes('razorpay_refund_id')) await addCol('credit_transactions', 'razorpay_refund_id', "VARCHAR(255) DEFAULT NULL");
      if (!ctCols.includes('razorpay_order_id'))  await addCol('credit_transactions', 'razorpay_order_id',  "VARCHAR(255) DEFAULT NULL");

      // ── payment_orders: payment_id column ────────────────────────────────────
      const poCols = await getColumns('payment_orders');
      if (!poCols.includes('razorpay_payment_id')) await addCol('payment_orders', 'razorpay_payment_id', "VARCHAR(255) DEFAULT NULL");

      // ── member_file_downloads: original_name column ───────────────────────────
      const dldCols = await getColumns('member_file_downloads');
      if (!dldCols.includes('original_name')) await addCol('member_file_downloads', 'original_name', "VARCHAR(500) DEFAULT NULL AFTER file_url");

      // ── announcements: columns added after original schema ───────────────────
      const annCols = await getColumns('announcements');
      if (!annCols.includes('slug'))       await addCol('announcements', 'slug',       "TEXT DEFAULT ''");
      if (!annCols.includes('content'))    await addCol('announcements', 'content',    "TEXT DEFAULT ''");
      if (!annCols.includes('excerpt'))    await addCol('announcements', 'excerpt',    "TEXT DEFAULT ''");
      if (!annCols.includes('image'))      await addCol('announcements', 'image',      "TEXT DEFAULT ''");
      if (!annCols.includes('image_alt'))  await addCol('announcements', 'image_alt',  "TEXT DEFAULT ''");
      if (!annCols.includes('updated_at')) await addCol('announcements', 'updated_at', "DATETIME DEFAULT NULL");

      console.log('[DB] MySQL table auto-check complete.');
    } catch (err) {
      console.error('[DB] ensureMySQLTables error (non-fatal):', err.message);
    } finally {
      if (conn) conn.release();
    }
  }

  // Delay slightly so the MySQL pool is fully ready before running migrations
  setTimeout(ensureMySQLTables, 3000);

  pool = mysql.createPool({
    host: dbHost,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || '',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || '',
    charset: process.env.DB_CHARSET || 'utf8mb4',
    waitForConnections: true,
    // 2 GB RAM server: session store has its own 2-connection pool (separate).
    // Main pool: 10 connections × ~6 MB each ≈ 60 MB — well within budget.
    // The dbMiddleware holds one connection per HTTP request for the full request
    // lifetime, so connectionLimit must exceed peak concurrency. The in-process
    // cron occupies one connection every minute as well.
    // Override with DB_POOL_SIZE env var if you need to tune for your host.
    connectionLimit: parseInt(process.env.DB_POOL_SIZE || '10'),
    queueLimit: 50,
    timezone: '+00:00',
    // Reconnect automatically if the Hostinger MySQL server closes idle connections.
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  });
  console.log('[DB] Using MySQL →', dbHost, '/', process.env.DB_NAME);

  // ── TEMPORARY pool diagnostics ──────────────────────────────────────────────
  // Logs pool saturation every 10s so an in-progress "Queue limit reached"
  // incident can be caught live instead of reconstructed after the fact from
  // timestamps. _allConnections/_freeConnections/_connectionQueue are
  // undocumented mysql2 internals (no public pool.stats() API exists as of
  // mysql2 3.x) — safe to read, never write. Remove this block (or gate it
  // behind an env var) once the current incident is resolved and the fix has
  // been observed holding under real traffic for a few days.
  setInterval(() => {
    const all = pool._allConnections?.length ?? -1;
    const free = pool._freeConnections?.length ?? -1;
    const queued = pool._connectionQueue?.length ?? -1;
    console.log(`[DB Pool] all=${all} free=${free} busy=${all - free} queued=${queued}`);
  }, 10000).unref();
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
    const [blogResult] = await conn.execute(
      "UPDATE blogs SET status = 'published' WHERE status = 'scheduled' AND publish_date <= ?",
      [nowUtc]
    );
    await conn.execute(
      "UPDATE announcements SET status = 'active' WHERE status = 'scheduled' AND publish_date <= ?",
      [nowUtc]
    );
    // Bust homepage cache whenever a scheduled article goes live
    if (blogResult?.affectedRows > 0) {
      const CacheService = require('./services/CacheService');
      new CacheService().invalidate('homepage_data_public');
    }
  } catch { /* fail silently */ }
}

// ── Single-query executor ─────────────────────────────────────────────────────
// For read-only / single-statement call sites that don't need
// beginTransaction()/commit()/rollback() and shouldn't hold a connection for
// longer than one query. In MySQL mode, pool.execute() acquires a connection,
// runs the query, and releases it internally — no manual getConnection()/
// release() needed, and the connection is never held across unrelated work
// (SMTP sends, response serialization, etc.) the way req.db is. In SQLite dev
// mode there's no real pooling, so this is just the shared adapter.
const poolExec = isSQLite ? sqliteAdapter : { execute: (sql, params) => pool.execute(sql, params) };

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

module.exports = { pool, dbMiddleware, isSQLite, poolExec };
