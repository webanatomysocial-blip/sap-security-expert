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
    { name: 'video_url',                   def: "TEXT DEFAULT NULL" },
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

  // ambassadors table — Country Ambassador applications, mirrors contributors
  sqliteDb.prepare(`
    CREATE TABLE IF NOT EXISTS ambassadors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      linkedin TEXT DEFAULT NULL,
      country TEXT DEFAULT NULL,
      state TEXT DEFAULT NULL,
      city TEXT DEFAULT NULL,
      organization TEXT DEFAULT NULL,
      current_role TEXT DEFAULT NULL,
      years_experience TEXT DEFAULT NULL,
      expertise TEXT DEFAULT NULL,
      other_expertise TEXT DEFAULT NULL,
      motivation TEXT DEFAULT NULL,
      contribution_examples TEXT DEFAULT NULL,
      nomination_type TEXT DEFAULT 'self',
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      approved_at DATETIME DEFAULT NULL,
      image TEXT DEFAULT NULL,
      rejection_reason TEXT DEFAULT NULL,
      is_deleted INTEGER DEFAULT 0,
      deleted_at DATETIME DEFAULT NULL,
      deletion_method TEXT DEFAULT NULL,
      deletion_ip TEXT DEFAULT NULL,
      deletion_confirmation_method TEXT DEFAULT NULL
    )
  `).run();

  // ambassadors table — badge columns added after initial creation
  const ambassadorColumns = [
    { name: 'has_badge',        def: "INTEGER NOT NULL DEFAULT 0" },
    { name: 'badge_year',       def: "INTEGER DEFAULT NULL" },
    { name: 'detected_country', def: "TEXT DEFAULT NULL" },
    { name: 'location_verified',def: "INTEGER NOT NULL DEFAULT 0" },
  ];
  const ambassadorsExisting = sqliteDb.prepare("PRAGMA table_info(ambassadors)").all().map(r => r.name);
  for (const col of ambassadorColumns) {
    if (!ambassadorsExisting.includes(col.name)) {
      sqliteDb.prepare(`ALTER TABLE ambassadors ADD COLUMN ${col.name} ${col.def}`).run();
      console.log(`[DB] Migration: added ambassadors.${col.name}`);
    }
  }

  // Append-only log of every badge grant, one row per (country, year) — a
  // country's badge can pass to a different ambassador in a later year, or
  // stay with the same one across consecutive years; either way each grant
  // gets its own row so admin can see the full history, not just who
  // currently holds it (which is all `ambassadors.has_badge` tracks).
  sqliteDb.prepare(`
    CREATE TABLE IF NOT EXISTS ambassador_badge_history (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      ambassador_id INTEGER NOT NULL,
      country       TEXT NOT NULL,
      badge_year    INTEGER NOT NULL,
      granted_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (country, badge_year)
    )
  `).run();

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
    { name: 'approved_at',                  def: "DATETIME DEFAULT NULL" },
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

  // members table — login tracking + country
  const membersColumns4 = [
    { name: 'last_login',      def: "DATETIME DEFAULT NULL" },
    { name: 'login_count',     def: "INTEGER NOT NULL DEFAULT 0" },
    { name: 'country',         def: "TEXT DEFAULT NULL" },
    { name: 'goals',           def: "TEXT DEFAULT NULL" },
    { name: 'current_role',    def: "TEXT DEFAULT NULL" },
    { name: 'research_opt_in', def: "INTEGER DEFAULT NULL" },
  ];
  const membersExisting4 = sqliteDb.prepare("PRAGMA table_info(members)").all().map(r => r.name);
  for (const col of membersColumns4) {
    if (!membersExisting4.includes(col.name)) {
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
    { name: 'ambassador_id',                def: "INTEGER DEFAULT NULL" },
    { name: 'last_login',                   def: "DATETIME DEFAULT NULL" },
    { name: 'login_count',                  def: "INTEGER NOT NULL DEFAULT 0" },
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
  try { sqliteDb.prepare('ALTER TABLE credit_transactions ADD COLUMN razorpay_order_id TEXT').run(); } catch { /* column already exists */ }
  try { sqliteDb.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_ctx_order ON credit_transactions(razorpay_order_id) WHERE razorpay_order_id IS NOT NULL').run(); } catch { /* index already exists */ }
  // Add razorpay_refund_id so refund webhooks can be safely retried without double-reversing credits
  try { sqliteDb.prepare('ALTER TABLE credit_transactions ADD COLUMN razorpay_refund_id TEXT').run(); } catch { /* column already exists */ }
  try { sqliteDb.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_ctx_refund ON credit_transactions(razorpay_refund_id) WHERE razorpay_refund_id IS NOT NULL').run(); } catch { /* index already exists */ }

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
  try { sqliteDb.prepare('CREATE INDEX IF NOT EXISTS idx_al_action ON audit_logs(action)').run(); } catch { /* index already exists */ }
  try { sqliteDb.prepare('CREATE INDEX IF NOT EXISTS idx_al_created_at ON audit_logs(created_at)').run(); } catch { /* index already exists */ }

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

      // Each migration step below is wrapped in its own try/catch — this
      // whole function previously shared ONE try/catch, so a single failing
      // statement (verified live: `description TEXT DEFAULT ''` on MySQL
      // 8/9 throws ER_BLOB_CANT_HAVE_DEFAULT even under CREATE TABLE IF NOT
      // EXISTS, since MySQL validates column defs before checking
      // existence) silently aborted every migration after it, including
      // creating the `ambassadors` table entirely. Isolating each step
      // means one bad statement only skips itself.
      const step = async (label, fn) => {
        try {
          await fn();
        } catch (err) {
          console.error(`[DB] MySQL migration step "${label}" failed (non-fatal):`, err.message);
        }
      };

      await step('create credit_activities', () => conn.execute(`
        CREATE TABLE IF NOT EXISTS credit_activities (
          id          INT          NOT NULL AUTO_INCREMENT,
          \`key\`     VARCHAR(100) NOT NULL,
          label       VARCHAR(255) NOT NULL,
          description TEXT         DEFAULT NULL,
          credits     INT          NOT NULL DEFAULT 1,
          is_active   TINYINT(1)   NOT NULL DEFAULT 1,
          created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_ca_key (\`key\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `));

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
        await step(`seed credit_activities.${key}`, () => conn.execute(
          'INSERT IGNORE INTO credit_activities (`key`, label, description, credits) VALUES (?, ?, ?, ?)',
          [key, label, description, credits]
        ));
      }

      await step('create ambassadors', () => conn.execute(`
        CREATE TABLE IF NOT EXISTS ambassadors (
          id                            INT           NOT NULL AUTO_INCREMENT,
          full_name                     VARCHAR(255)  NOT NULL,
          email                         VARCHAR(255)  NOT NULL,
          linkedin                      VARCHAR(500)  DEFAULT NULL,
          country                       VARCHAR(100)  DEFAULT NULL,
          state                         VARCHAR(100)  DEFAULT NULL,
          city                          VARCHAR(100)  DEFAULT NULL,
          organization                  VARCHAR(255)  DEFAULT NULL,
          current_role                  VARCHAR(255)  DEFAULT NULL,
          years_experience              VARCHAR(50)   DEFAULT NULL,
          expertise                     TEXT          DEFAULT NULL,
          other_expertise               TEXT          DEFAULT NULL,
          motivation                    TEXT          DEFAULT NULL,
          contribution_examples         TEXT          DEFAULT NULL,
          nomination_type               VARCHAR(50)   DEFAULT 'self',
          status                        VARCHAR(50)   DEFAULT 'pending',
          created_at                    DATETIME      DEFAULT CURRENT_TIMESTAMP,
          approved_at                   DATETIME      DEFAULT NULL,
          image                         VARCHAR(255)  DEFAULT NULL,
          rejection_reason              TEXT          DEFAULT NULL,
          is_deleted                    TINYINT(1)    DEFAULT 0,
          deleted_at                    DATETIME      DEFAULT NULL,
          deletion_method               VARCHAR(50)   DEFAULT NULL,
          deletion_ip                   VARCHAR(45)   DEFAULT NULL,
          deletion_confirmation_method  VARCHAR(50)   DEFAULT NULL,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `));

      // Append-only log of every badge grant, one row per (country, year) —
      // see the matching SQLite table above for why this exists alongside
      // ambassadors.has_badge (which only tracks the current holder).
      await step('create ambassador_badge_history', () => conn.execute(`
        CREATE TABLE IF NOT EXISTS ambassador_badge_history (
          id            INT      NOT NULL AUTO_INCREMENT,
          ambassador_id INT      NOT NULL,
          country       VARCHAR(100) NOT NULL,
          badge_year    INT      NOT NULL,
          granted_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_abh_country_year (country, badge_year),
          KEY idx_abh_ambassador (ambassador_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `));

      await step('create site_settings', () => conn.execute(`
        CREATE TABLE IF NOT EXISTS site_settings (
          \`key\`      VARCHAR(100) NOT NULL,
          value        TEXT         NOT NULL,
          updated_at   DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`key\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `));
      await step('seed site_settings default', () => conn.execute(
        "INSERT IGNORE INTO site_settings (`key`, value) VALUES ('paywall_default_preview_paragraphs', '3')"
      ));

      await step('create member_file_downloads', () => conn.execute(`
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
      `));

      await step('create email_logs', () => conn.execute(`
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
      `));

      await step('create email_queue', () => conn.execute(`
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
      `));

      await step('create audit_logs', () => conn.execute(`
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
      `));
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
      if (!memberCols.includes('last_login'))          await addCol('members', 'last_login',         "DATETIME DEFAULT NULL");
      if (!memberCols.includes('login_count'))         await addCol('members', 'login_count',        "INT NOT NULL DEFAULT 0");
      if (!memberCols.includes('country'))             await addCol('members', 'country',            "VARCHAR(100) DEFAULT NULL");
      if (!memberCols.includes('goals'))               await addCol('members', 'goals',              "TEXT DEFAULT NULL");
      if (!memberCols.includes('current_role'))        await addCol('members', 'current_role',       "VARCHAR(100) DEFAULT NULL");
      if (!memberCols.includes('research_opt_in'))     await addCol('members', 'research_opt_in',    "TINYINT(1) DEFAULT NULL");

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
      if (!blogCols.includes('video_url'))                  await addCol('blogs', 'video_url',                  "VARCHAR(500) DEFAULT NULL");

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
      if (!contCols.includes('approved_at'))                  await addCol('contributors', 'approved_at',                  "DATETIME DEFAULT NULL");

      // ── ambassadors: Country Ambassador badge columns ──────────────────────────
      const ambCols = await getColumns('ambassadors');
      if (!ambCols.includes('has_badge'))                     await addCol('ambassadors', 'has_badge',                     "TINYINT(1) NOT NULL DEFAULT 0");
      if (!ambCols.includes('badge_year'))                    await addCol('ambassadors', 'badge_year',                    "INT DEFAULT NULL");
      if (!ambCols.includes('detected_country'))              await addCol('ambassadors', 'detected_country',              "VARCHAR(100) DEFAULT NULL");
      if (!ambCols.includes('location_verified'))             await addCol('ambassadors', 'location_verified',             "TINYINT(1) NOT NULL DEFAULT 0");

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
      if (!userCols.includes('ambassador_id'))                await addCol('users', 'ambassador_id',                "INT DEFAULT NULL");
      if (!userCols.includes('last_login'))                   await addCol('users', 'last_login',                   "DATETIME DEFAULT NULL");
      if (!userCols.includes('login_count'))                  await addCol('users', 'login_count',                  "INT NOT NULL DEFAULT 0");

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
    // Main pool: 20 connections × ~6 MB each ≈ 120 MB — still well within budget.
    // With lazy connection acquisition (see dbMiddleware below), connections are
    // only held during actual DB work, not for the full request lifetime.
    // The previous eager-checkout approach meant every concurrent HTTP request
    // (including SSR loopback calls, cached responses, static files) consumed
    // a pool slot; 10 slots was trivially exhausted under moderate traffic.
    // Override with DB_POOL_SIZE env var if you need to tune for your host.
    connectionLimit: parseInt(process.env.DB_POOL_SIZE || '25'),
    queueLimit: 200,
    timezone: '+00:00',
    // Reconnect automatically if the Hostinger MySQL server closes idle connections.
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    // Acquire timeout: fail fast rather than silently queuing forever.
    // Default in mysql2 is 10000ms; keep it explicit.
    connectTimeout: 10000,
  });
  console.log('[DB] Using MySQL →', dbHost, '/', process.env.DB_NAME);

  // ── TEMPORARY pool diagnostics ──────────────────────────────────────────────
  // Logs pool saturation every 10s so pool state is visible in server logs.
  setInterval(() => {
    const inner = pool.pool; // Promise pool wraps the core Pool on `.pool`
    const all    = inner?._allConnections?.length    ?? '?';
    const free   = inner?._freeConnections?.length   ?? '?';
    const queued = inner?._connectionQueue?.length   ?? '?';
    const busy   = (typeof all === 'number' && typeof free === 'number') ? all - free : '?';
    console.log(`[DB Pool] all=${all} free=${free} busy=${busy} queued=${queued}`);
  }, 10000).unref();
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

// ── Founder contributor record ────────────────────────────────────────────────
// The site founder (Raghu Boddu) publishes as the admin user, not through the
// contributor application flow, so he has no `contributors` row. The public
// leaderboard / "Top Contributors" widget only reads from `contributors`
// (see findLeaderboardContributors), so without this he never appears there
// despite authoring approved articles. Idempotent — safe to run on every startup.
async function ensureFounderContributor() {
  try {
    const [[admin]] = await poolExec.execute(
      "SELECT id, email, full_name, profile_image, bio, designation FROM users WHERE role = 'admin' AND full_name = 'Raghu Boddu' AND (contributor_id IS NULL OR contributor_id = 0) LIMIT 1"
    );
    if (!admin) return;

    const [[existing]] = await poolExec.execute(
      "SELECT id FROM contributors WHERE full_name = 'Raghu Boddu' LIMIT 1"
    );

    let contributorId = existing?.id;
    if (!contributorId) {
      const [result] = await poolExec.execute(
        `INSERT INTO contributors (full_name, email, role, image, short_bio, status, created_at)
         VALUES (?, ?, ?, ?, ?, 'approved', CURRENT_TIMESTAMP)`,
        [admin.full_name, admin.email, admin.designation || null, admin.profile_image || null, admin.bio || null]
      );
      contributorId = result.insertId;
    } else {
      await poolExec.execute("UPDATE contributors SET status = 'approved' WHERE id = ?", [contributorId]);
    }

    await poolExec.execute("UPDATE users SET contributor_id = ? WHERE id = ?", [contributorId, admin.id]);
    console.log(`[DB] Linked founder contributor record for Raghu Boddu (contributor id ${contributorId})`);
  } catch (err) {
    console.error('[DB] ensureFounderContributor error (non-fatal):', err.message);
  }
}
setTimeout(ensureFounderContributor, 4000);

// ── Backfill approved_at for pre-existing contributors ──────────────────────────
// The inactivity sweep needs `approved_at` to measure the 3-month window, but
// contributors approved before this feature shipped have no value for it (the
// column defaults to NULL). Rather than backdating them — which would let the
// sweep deactivate long-time contributors immediately on deploy — this starts
// their 3-month clock from today, the moment this migration first runs. Only
// touches rows that still have NULL, so it's a one-time backfill per contributor,
// safe to run on every startup.
async function backfillContributorApprovedAt() {
  try {
    const [result] = await poolExec.execute(
      "UPDATE contributors SET approved_at = CURRENT_TIMESTAMP WHERE status = 'approved' AND approved_at IS NULL"
    );
    if (result.affectedRows) {
      console.log(`[DB] Backfilled approved_at for ${result.affectedRows} existing contributor(s) — 3-month inactivity window starts today`);
    }
  } catch (err) {
    console.error('[DB] backfillContributorApprovedAt error (non-fatal):', err.message);
  }
}
setTimeout(backfillContributorApprovedAt, 4500);

// ── Auto-publish hook ─────────────────────────────────────────────────────────
// Runs at most once per 60 s — transitions scheduled items to published/active.
// Uses its own short-lived connection (pool.execute in MySQL mode, or the
// shared sqliteAdapter in dev mode) so it never consumes the per-request slot.
let lastAutoPublish = 0;
async function runAutoPublish() {
  const now = Date.now();
  if (now - lastAutoPublish < 60000) return;
  lastAutoPublish = now;
  const nowUtc = new Date().toISOString().slice(0, 19).replace('T', ' ');
  // In MySQL mode use pool.execute() so it acquires+releases its own connection
  // and doesn't consume the calling request's slot. In SQLite dev mode use the
  // shared adapter (no pool exists).
  const exec = isSQLite ? sqliteAdapter : pool;
  try {
    const [blogResult] = await exec.execute(
      "UPDATE blogs SET status = 'published' WHERE status = 'scheduled' AND publish_date <= ?",
      [nowUtc]
    );
    await exec.execute(
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

// ── Lazy-connection proxy ─────────────────────────────────────────────────────
// Previously dbMiddleware called pool.getConnection() eagerly on every request,
// holding the connection for the full HTTP request lifetime (until res.finish/
// close). This consumed a pool slot even for:
//   • requests whose response came entirely from in-memory cache
//   • Next.js SSR loopback calls (INTERNAL_API_URL) that hit /api/* routes
//   • requests that return early (auth failure, 404, etc.) before any DB work
// With only 10 pool slots, any burst of 10+ concurrent requests (very common
// with SSR where a single page load triggers multiple parallel /api/* fetches)
// immediately exhausted the pool, queuing further requests and eventually
// hitting the "Queue limit reached" error.
//
// The lazy proxy below acquires a real connection only on the first actual
// DB operation (execute, beginTransaction, etc.) and releases it as soon as
// the response finishes. Routes/controllers that never touch the DB (pure-cache
// hits, early-exit auth checks) never check out a connection at all.
function dbMiddleware(req, res, next) {
  if (isSQLite) {
    // SQLite: reuse the single shared adapter; release() is a no-op
    req.db = sqliteAdapter;
    runAutoPublish().catch(() => {});
    return next();
  }

  // ── MySQL: lazy proxy ────────────────────────────────────────────────────
  let conn = null;       // real PoolConnection, acquired on first use
  let released = false;  // guard against double-release
  let acquiring = null;  // single in-flight getConnection() Promise
  let pendingOps = 0;    // in-flight execute()/beginTransaction() calls
  let txOpen = false;    // between beginTransaction() and commit()/rollback()
  let wantRelease = false; // res already finished/closed

  // Release only once the response has finished AND nothing is still using
  // the connection (in-flight query or an open transaction). Without this
  // gating, fire-and-forget background work (e.g. notification/audit calls
  // left un-awaited by a controller) that outlives the response would keep
  // calling execute() on `conn` after it was already handed back to the pool
  // and possibly reassigned to a different request.
  const maybeRelease = () => {
    if (!released && conn && wantRelease && pendingOps === 0 && !txOpen) {
      released = true;
      const toRelease = conn;
      // Clear `conn`/`acquiring` so any further execute()/beginTransaction()
      // call (e.g. orphaned fire-and-forget work that outlives the response)
      // re-acquires a fresh connection via getConn() instead of reusing this
      // one after it's already back in the pool (and possibly handed to a
      // different request).
      conn = null;
      acquiring = null;
      released = false; // re-armed: the *new* conn (if any) needs its own release
      toRelease.release();
    }
  };
  const requestFinished = () => { wantRelease = true; maybeRelease(); };
  res.on('finish', requestFinished);
  res.on('close',  requestFinished);

  // Acquires a real connection (or waits for an already-in-flight acquisition)
  // and caches it on `conn` for reuse within the same request.
  async function getConn() {
    if (conn) return conn;
    if (!acquiring) {
      // Clear `acquiring` on rejection so a failed acquisition (transient
      // pool exhaustion/timeout) doesn't permanently poison the rest of this
      // request's DB access — without this, every subsequent execute()/
      // beginTransaction() call would just re-await the same rejected
      // promise forever instead of retrying pool.getConnection().
      acquiring = pool.getConnection().catch((err) => {
        acquiring = null;
        throw err;
      });
    }
    conn = await acquiring;
    return conn;
  }

  // Proxy object: looks like a PoolConnection to all callers, but defers
  // pool.getConnection() until the first actual DB operation.
  req.db = {
    async execute(sql, params) {
      pendingOps++;
      try {
        const c = await getConn();
        return await c.execute(sql, params);
      } finally {
        pendingOps--;
        maybeRelease();
      }
    },
    async beginTransaction() {
      pendingOps++;
      try {
        const c = await getConn();
        const result = await c.beginTransaction();
        txOpen = true;
        return result;
      } finally {
        pendingOps--;
        maybeRelease();
      }
    },
    async commit() {
      if (!conn) return;  // no transaction was started
      try {
        return await conn.commit();
      } finally {
        txOpen = false;
        maybeRelease();
      }
    },
    async rollback() {
      if (!conn) return;  // nothing to roll back
      try {
        return await conn.rollback().catch(() => {});
      } finally {
        txOpen = false;
        maybeRelease();
      }
    },
    release() { requestFinished(); },
    // Expose the underlying real connection for code that needs it directly
    // (e.g. PoolConnection-specific APIs). Will return null before the first
    // query — callers should use execute/beginTransaction instead.
    get _raw() { return conn; },
  };

  // runAutoPublish no longer needs a connection arg — it uses poolExec internally.
  // Fire-and-forget; never blocks the response.
  runAutoPublish().catch(() => {});

  next();
}

module.exports = { pool, dbMiddleware, isSQLite, poolExec };
