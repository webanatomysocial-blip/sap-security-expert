require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const compression = require('compression');
const session = require('express-session');
const cors = require('cors');
const path = require('path');

const { dbMiddleware, isSQLite } = require('./db');
const { safeCompare } = require('./middleware/auth');

const app = express();
const PORT = process.env.EXPRESS_PORT || 3001;

// ── Session store ──────────────────────────────────────────────────────────────
// SQLite mode: persist sessions in a SQLite file so they survive server restarts.
// MySQL mode: persist sessions in the DB via express-mysql-session.
let sessionStore;
if (isSQLite) {
  const SqliteSessionStore = require('better-sqlite3-session-store')(session);
  const Database = require('better-sqlite3');
  const sessionDb = new Database(path.join(__dirname, 'sessions.sqlite'));
  sessionStore = new SqliteSessionStore({ client: sessionDb, expired: { clear: true, intervalMs: 15 * 60 * 1000 } });
  console.log('[Sessions] Using SQLite session store (sessions.sqlite)');
} else {
  const MySQLStore = require('express-mysql-session')(session);
  const dbHost = process.env.DB_HOST || 'localhost';
  sessionStore = new MySQLStore({
    host: dbHost,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || '',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || '',
    createDatabaseTable: true,
    // 2 connections for sessions + 3 for main pool = 5 total.
    connectionLimit: parseInt(process.env.SESSION_POOL_SIZE || '2'),
    schema: { tableName: 'sessions', columnNames: { session_id: 'session_id', expires: 'expires', data: 'data' } },
  });
  sessionStore.on('error', function(error) {
    console.error('[Sessions] Session store error:', error.message);
  });
  console.log('[Sessions] Using MySQL session store');
}


// ── Middleware ──────────────────────────────────────────────────────────────────
const isProd = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);

// Gzip/deflate all responses
app.use(compression());

// CORS — allow the production domain + optional extra origin for split-server setups.
// FRONTEND_URL can be set when the frontend runs on a different domain (e.g. Vercel).
const siteUrl = (process.env.SITE_URL || 'http://sapsecurityexpert.com').replace(/\/$/, '');

const allowedOrigins = [
  siteUrl,
  siteUrl.replace('https://', 'https://www.'),
];
if (!isProd) {
  allowedOrigins.push(
    'http://localhost:5173', 'http://127.0.0.1:5173',
    'http://localhost:3000', 'http://127.0.0.1:3000',
    'http://localhost:3001', 'http://127.0.0.1:3001',
    'http://localhost:3002', 'http://127.0.0.1:3002',
    'http://localhost:3003', 'http://127.0.0.1:3003',
    'http://localhost:3004', 'http://127.0.0.1:3004',
    'http://localhost:8000', 'http://127.0.0.1:8000',
    'http://dev.sapsecurityexpert.com',
  );
}
// Optional extra origin for split-server setups (set FRONTEND_URL in .env if needed)
if (process.env.FRONTEND_URL) allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ''));

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
}));

// `verify` captures the exact raw bytes into req.rawBody before JSON-parsing them
// into req.body. Needed for the Razorpay webhook's HMAC signature check, which
// must be computed over the untouched request body — re-serializing req.body
// with JSON.stringify would not byte-for-byte match what Razorpay signed.
// Harmless for every other route: req.body is still parsed exactly as before.
app.use(express.json({
  limit: '5mb',
  verify: (req, _res, buf) => { req.rawBody = buf; },
}));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

app.use(session({
  key: 'connect.sid',
  secret: (() => {
    const s = process.env.SESSION_SECRET;
    if (!s || s === 'CHANGE_THIS') { console.error('FATAL: SESSION_SECRET is not set. Refusing to start.'); process.exit(1); }
    return s;
  })(),
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProd,            // require HTTPS in production
    sameSite: 'lax',           // 'lax' (not 'strict') — 'strict' silently drops the
                               // session cookie on Razorpay payment-return redirects
                               // because the navigation originates from razorpay.com.
                               // CSRF is already covered by the X-CSRF-Token header check.
    maxAge: 8 * 60 * 60 * 1000, // 8 hours — prevents indefinitely-lived stolen sessions
  },
}));

// Security headers
// Note: this API only ever returns JSON — the actual HTML pages are served by
// Next.js, which sets its own (stricter, nonce-based) CSP via src/middleware.js.
// This header is defense-in-depth for the case a JSON endpoint is navigated to
// directly; since no script/style/font ever needs to execute in that context,
// it can be tighter than a page-serving CSP would be.
app.use((_, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'self'; base-uri 'none';"
  );
  if (isProd) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
});

// Attach DB connection to every request
app.use(dbMiddleware);

// Health check — validates process liveness AND database connectivity.
// Mounted after dbMiddleware so it can reuse the request-scoped req.db connection.
app.get('/api/health', async (req, res) => {
  if (req.dbError) {
    return res.status(500).json({
      status: 'error',
      database: 'failed',
      message: req.dbError.message,
    });
  }

  try {
    if (!req.db) {
      throw new Error('Database connection is undefined');
    }
    await req.db.execute('SELECT 1');
    return res.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      database: 'failed',
      message: err.message,
    });
  }
});

// Serve uploaded files and static assets
const ROOT = path.join(__dirname, '..');
// Public uploads — one catch-all static handler for every subdirectory except
// /uploads/downloads, which is credit-gated and served by /api/downloads instead.
// Any future upload type (profiles, contributors, etc.) is served automatically
// without requiring a new express.static() line here.
app.use('/uploads', (req, res, next) => {
  // Block direct static access to downloads — they must go through /api/downloads.
  if (req.path.startsWith('/downloads')) return res.status(403).json({ status: 'error', message: 'Forbidden' });
  next();
}, express.static(path.join(ROOT, 'public/uploads'), { maxAge: '7d' }));
app.use('/assets', express.static(path.join(ROOT, 'public'), { maxAge: '1d' }));
// In unified mode (Hostinger) start.cjs routes /api/* and /uploads/* directly to
// this Express app before Next.js ever sees the request.

// ── Routes ─────────────────────────────────────────────────────────────────────

// Auth
app.use('/api', require('./routes/auth'));

// Posts (blogs)
app.use('/api/posts', require('./routes/posts'));

// Members
app.use('/api/member', require('./routes/members'));

// Payments / Membership
app.use('/api/payments', require('./routes/payments'));

// Protected file downloads — /api/downloads/stream?url=...
app.use('/api/downloads', require('./routes/downloads'));

// Contributors (public)
app.use('/api/contributors', require('./routes/contributors'));

// Country Ambassadors (public)
app.use('/api/ambassadors', require('./routes/ambassadors'));

// Comments
app.use('/api', require('./routes/comments'));

// OTP / password reset
app.use('/api', require('./routes/otp'));

// Uploads
app.use('/api', require('./routes/uploads'));

// Public read-only endpoints
app.use('/api', require('./routes/public'));

// Admin — ads
const adsRouter = require('./routes/admin/ads');
app.use('/api/ads', adsRouter);
app.use('/api/admin/ads', adsRouter);
const blogAdsRouter = require('./routes/admin/blog-ads');
app.use('/api/admin/blog-ads', blogAdsRouter);
app.use('/api/blog-ads', blogAdsRouter);

// Admin — announcements
const announcementsRouter = require('./routes/admin/announcements');
app.use('/api/announcements', announcementsRouter);
app.use('/api/admin/announcements', announcementsRouter);

// Admin — stats
app.use('/api', require('./routes/admin/stats'));

// Admin — profile (handles /profile, /profile/update, /reset-password)
app.use('/api/admin', require('./routes/admin/profile'));

// Admin — blog review
app.use('/api/admin/blogs', require('./routes/admin/blogs'));

// Admin — news/updates management
app.use('/api/admin/news', require('./routes/admin/news'));

// Admin — learning hub management
app.use('/api/admin/learnings', require('./routes/admin/learnings'));

// Admin — team/admin-account management
app.use('/api/admin/team', require('./routes/admin/team'));

// Admin — contributors management (all routes in one router, mounted at /api/admin)
app.use('/api/admin', require('./routes/admin/contributors'));

// Admin — country ambassadors management (mounted at /api/admin)
app.use('/api/admin', require('./routes/admin/ambassadors'));

// Admin — credit bundles & coupons
app.use('/api/admin', require('./routes/admin/credits'));

// Admin — members management
app.use('/api/admin/members', require('./routes/admin/members'));
app.use('/api/admin/reset-member-password', (req, res, next) => {
  req.url = '/reset-password';
  next();
}, require('./routes/admin/members'));

// Admin — comments management
app.use('/api/admin/comments', require('./routes/admin/comments'));

// Homepage Featured Insights (admin-curated)
app.use('/api/admin/featured-insights', require('./routes/admin/featured'));

// Email templates
app.use('/api/admin/email-templates', require('./routes/admin/email-templates'));

// Changelog
app.use('/api/admin/changelog', require('./routes/admin/changelog'));

// Site settings (admin + public read)
app.use('/api/admin/settings', require('./routes/admin/settings'));

// Audit / change logs
app.use('/api/admin/audit-logs', require('./routes/admin/audit'));

// Test email delivery
app.use('/api/admin/test-email', require('./routes/admin/test-email'));

// Cron endpoint (secured by CRON_SECRET)
app.post('/api/cron/send-emails', async (req, res) => {
  const secret = req.query.secret || req.headers['x-cron-secret'];
  if (!process.env.CRON_SECRET || !safeCompare(secret || '', process.env.CRON_SECRET)) {
    return res.status(403).json({ status: 'error', message: 'Unauthorized' });
  }
  try {
    const MailService = require('./services/MailService');
    const mailService = MailService.getInstance();
    // Claim rows atomically — prevents double-send if two drainers run at once
    const [claimed] = await req.db.execute(
      "UPDATE email_queue SET status='sending' WHERE status='pending' ORDER BY id ASC LIMIT 12"
    );
    if (!claimed.affectedRows) return res.json({ status: 'success', sent: 0, total: 0 });
    const [emails] = await req.db.execute(
      "SELECT id, recipient, subject, body, attempts FROM email_queue WHERE status='sending' ORDER BY id ASC LIMIT 12"
    );
    let sent = 0;
    for (const email of emails) {
      const attempts = email.attempts + 1;
      const ok = await mailService.sendDirect(req.db, email.recipient, email.subject, email.body);
      if (ok) {
        await req.db.execute("UPDATE email_queue SET status='sent', sent_at=CURRENT_TIMESTAMP, attempts=? WHERE id=?", [attempts, email.id]);
        sent++;
      } else if (attempts >= 3) {
        await req.db.execute("UPDATE email_queue SET status='failed', attempts=?, error_message='Max attempts reached' WHERE id=?", [attempts, email.id]);
      } else {
        await req.db.execute("UPDATE email_queue SET status='pending', attempts=? WHERE id=?", [attempts, email.id]);
      }
    }
    return res.json({ status: 'success', sent, total: emails.length });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// Health endpoint moved above dbMiddleware

// 404 fallback for API routes
app.use('/api', (req, res) => {
  res.status(404).json({ status: 'error', message: `Endpoint not found: ${req.path}` });
});

// Global error handler — catches multer errors, unhandled throws in middleware/routes,
// and everything forwarded via next(err) from route/controller code.
// Must be 4-argument to be recognised as an error handler by Express.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;

  // Single standardized log format — the only place a real error is ever
  // visible. Only 4xx messages are considered safe to send to the client:
  // those are validation errors an app author wrote on purpose to be
  // user-facing (e.g. "email is required"). A 500 means something
  // unexpected threw — often a raw driver/DB error (table names, SQL
  // fragments, column names, filesystem paths) — which must never reach
  // the response body.
  console.error(
    `[Express Error]\n` +
    `Method: ${req.method}\n` +
    `URL: ${req.originalUrl || req.path}\n` +
    `Status: ${status}\n` +
    `Message: ${err.message}\n` +
    `Stack: ${err.stack}\n` +
    `Timestamp: ${new Date().toISOString()}`
  );

  const clientMessage = status >= 500 ? 'Internal server error' : (err.message || 'Request failed');
  if (!res.headersSent) {
    res.status(status).json({ status: 'error', message: clientMessage });
  }
});

// ── Well-known files ───────────────────────────────────────────────────────────
// robots.txt and sitemap.xml are now generated by Next.js App Router metadata
// files (src/app/robots.js and src/app/sitemap.js). These Express routes serve
// as a fallback if Express is accessed directly (bypassing Next.js).
const canonicalUrl = (process.env.CANONICAL_URL || 'http://sapsecurityexpert.com').replace(/\/$/, '');

// Redirect legacy register URL to the signup page — handles hard navigations
// before the React bundle has a chance to intercept with its own client-side route.
app.get('/member/register', (_req, res) => res.redirect(301, '/member/signup'));

app.get('/robots.txt', (_req, res) => {
  res.set('Content-Type', 'text/plain');
  res.set('Cache-Control', 'public, max-age=86400');
  res.send(
    `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /member/\nDisallow: /api/\n\nSitemap: ${canonicalUrl}/sitemap.xml\n`
  );
});

// /sitemap.xml — serve via the Express API route directly (no redirect)
app.get('/sitemap.xml', (req, _res, next) => {
  req.url = '/api/sitemap.xml';
  next('router');
});

// All HTML is served by Next.js (port 3000). Express has no HTML catch-all.

// ── In-process email cron (production) ─────────────────────────────────────────
// Runs inside the Express process — no separate cron.js process needed on Railway.
// Skipped in SQLite/dev mode; only activates when MySQL is configured.
if (!isSQLite && process.env.NODE_ENV === 'production') {
  try {
    const cron = require('node-cron');
    const MailService = require('./services/MailService');
    cron.schedule('* * * * *', async () => {
      try {
        const { poolExec } = require('./db');
        const mailService = MailService.getInstance();

        // ── Phase 1: claim pending rows ─────────────────────────────────────
        // poolExec.execute() acquires a connection, runs one statement, and
        // releases it immediately — no connection is held past this call.
        // Each statement here auto-commits on its own (no beginTransaction()
        // was ever used in this cron), so claim + read can safely run on two
        // different pooled connections: by the time the SELECT runs, the
        // UPDATE has already committed and is visible to any connection.
        const [claimed] = await poolExec.execute(
          "UPDATE email_queue SET status='sending' WHERE status='pending' ORDER BY id ASC LIMIT 12"
        );
        if (!claimed.affectedRows) return;
        const [emails] = await poolExec.execute(
          "SELECT id, recipient, subject, body, attempts FROM email_queue WHERE status='sending' ORDER BY id ASC LIMIT 12"
        );

        // ── Phase 2: send — no DB connection held during any of this ────────
        // Previously a single pooled connection sat checked-out for this
        // entire loop, including every SMTP round-trip. A stalled SMTP send
        // (dead peer, no timeout configured on the transporter) could hold
        // that connection indefinitely, and since node-cron doesn't skip
        // overlapping runs, the next minute's tick would grab another
        // connection and repeat — consuming the pool one stalled connection
        // at a time. `db` is passed as `null`: MailService._logDb() no
        // longer uses the caller's connection (it uses poolExec internally),
        // so nothing here depends on holding a connection open.
        const results = [];
        let sent = 0;
        for (const email of emails) {
          const attempts = email.attempts + 1;
          const ok = await mailService.sendDirect(null, email.recipient, email.subject, email.body);
          if (ok) sent++;
          results.push({ id: email.id, ok, attempts });
        }

        // ── Phase 3: write results — one short-lived connection per update ──
        for (const r of results) {
          if (r.ok) {
            await poolExec.execute("UPDATE email_queue SET status='sent', sent_at=CURRENT_TIMESTAMP, attempts=? WHERE id=?", [r.attempts, r.id]);
          } else if (r.attempts >= 3) {
            await poolExec.execute("UPDATE email_queue SET status='failed', attempts=?, error_message='Max attempts reached' WHERE id=?", [r.attempts, r.id]);
          } else {
            await poolExec.execute("UPDATE email_queue SET status='pending', attempts=? WHERE id=?", [r.attempts, r.id]);
          }
        }

        if (emails.length) console.log(`[cron] Sent ${sent}/${emails.length} emails`);
      } catch (err) {
        console.error('[cron] Error:', err.message);
      }
    });
    console.log('[cron] In-process email queue cron started');
  } catch (err) {
    console.warn('[cron] node-cron not available:', err.message);
  }
}

// ── Daily contributor inactivity sweep ──────────────────────────────────────
// Deactivates approved contributors who published 0 approved/published
// articles within 3 months of approval, and emails both the contributor and
// the admin. Also enabled in SQLite/dev (unlike the email cron above) so it
// can be tested locally — translateSQL() in db.js already converts the
// MySQL DATE_SUB/NOW() syntax in the query to SQLite's datetime('now', ...).
if (isSQLite || process.env.NODE_ENV === 'production') {
  try {
    const cron = require('node-cron');
    const MailService = require('./services/MailService');
    cron.schedule('0 4 * * *', async () => {
      try {
        const { poolExec } = require('./db');
        const contributorsRepo = require('./repositories/admin/contributorsRepository');
        const NotificationService = require('./services/NotificationService');
        const mailService = MailService.getInstance();
        const notifier = new NotificationService(mailService, poolExec);

        const inactive = await contributorsRepo.findInactiveContributorsForDeactivation(poolExec);
        const reason = 'No articles published within 3 months of approval.';

        for (const c of inactive) {
          await contributorsRepo.deactivateContributor(poolExec, c.id);
          await notifier.notifyContributorDeactivated(c.email, c.full_name, reason).catch(() => {});
          await notifier.notifyAdminContributorDeactivated(c.full_name, c.email, reason).catch(() => {});
        }

        if (inactive.length) console.log(`[cron] Auto-deactivated ${inactive.length} inactive contributor(s)`);
      } catch (err) {
        console.error('[cron] Contributor inactivity sweep error:', err.message);
      }
    });
    console.log('[cron] Contributor inactivity sweep cron started');

    // Same rule, same schedule, for Country Ambassadors — a badge is still
    // an earned recognition, but the account behind it goes dormant the
    // same way a contributor's does if nothing gets published.
    cron.schedule('0 4 * * *', async () => {
      try {
        const { poolExec } = require('./db');
        const ambassadorsRepo = require('./repositories/admin/ambassadorsRepository');
        const NotificationService = require('./services/NotificationService');
        const mailService = MailService.getInstance();
        const notifier = new NotificationService(mailService, poolExec);

        const inactive = await ambassadorsRepo.findInactiveAmbassadorsForDeactivation(poolExec);
        const reason = 'No articles published within 3 months of approval.';

        for (const a of inactive) {
          await ambassadorsRepo.deactivateAmbassador(poolExec, a.id);
          await notifier.notifyAmbassadorDeactivated(a.email, a.full_name, reason).catch(() => {});
          await notifier.notifyAdminAmbassadorDeactivated(a.full_name, a.email, reason).catch(() => {});
        }

        if (inactive.length) console.log(`[cron] Auto-deactivated ${inactive.length} inactive ambassador(s)`);
      } catch (err) {
        console.error('[cron] Ambassador inactivity sweep error:', err.message);
      }
    });
    console.log('[cron] Ambassador inactivity sweep cron started');
  } catch (err) {
    console.warn('[cron] node-cron not available:', err.message);
  }
}

// ── Start (only when run directly, not when required by unified server) ────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[SAP Security Expert] Express API running on http://localhost:${PORT}`);
  });
}

module.exports = app;
