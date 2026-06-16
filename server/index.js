require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const compression = require('compression');
const session = require('express-session');
const cors = require('cors');
const path = require('path');

const { dbMiddleware, isSQLite } = require('./db');

const app = express();
const PORT = process.env.EXPRESS_PORT || 3001;

// ── Session store ──────────────────────────────────────────────────────────────
// SQLite mode: use in-memory sessions (fine for local dev/testing).
// MySQL mode: persist sessions in the DB via express-mysql-session.
let sessionStore;
if (isSQLite) {
  sessionStore = new session.MemoryStore();
  console.log('[Sessions] Using in-memory store (SQLite dev mode)');
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
    // Keep session store to 3 connections so total (3 + DB_POOL_SIZE 5 = 8)
    // stays within Hostinger shared MySQL per-user connection limits.
    connectionLimit: parseInt(process.env.SESSION_POOL_SIZE || '3'),
    schema: { tableName: 'sessions', columnNames: { session_id: 'session_id', expires: 'expires', data: 'data' } },
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
const siteUrl = (process.env.SITE_URL || 'https://sap.webanatomy.in').replace(/\/$/, '');

const allowedOrigins = [
  siteUrl,
  siteUrl.replace('https://', 'https://www.'),
  'http://localhost:5173', 'http://127.0.0.1:5173',
  'http://localhost:3000', 'http://127.0.0.1:3000',
  'http://localhost:8000', 'http://127.0.0.1:8000',
];
// Optional extra origin for split-server setups (set FRONTEND_URL in .env if needed)
if (process.env.FRONTEND_URL) allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ''));

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

app.use(session({
  key: 'connect.sid',
  secret: process.env.SESSION_SECRET || 'sap_security_expert_secret_key_change_in_prod',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProd,            // true in prod — requires HTTPS (Hostinger provides this)
    sameSite: 'lax',           // 'lax' (not 'strict') — 'strict' silently drops the
                               // session cookie on Razorpay payment-return redirects
                               // because the navigation originates from razorpay.com.
                               // CSRF is already covered by the X-CSRF-Token header check.
    maxAge: null,              // session cookie — expires on browser close
  },
}));

// Security headers (mirror db.php)
app.use((_, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
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
// Uploads: 7-day cache (content-addressed by filename in practice)
app.use('/uploads', express.static(path.join(ROOT, 'public/uploads'), { maxAge: '7d' }));
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

// Contributors (public)
app.use('/api/contributors', require('./routes/contributors'));
app.use('/api', require('./routes/contributors')); // legacy get_contributor_profile.php

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

// Admin — contributors management (all routes in one router, mounted at /api/admin)
app.use('/api/admin', require('./routes/admin/contributors'));
// Legacy PHP path alias
app.post('/api/delete_contributor.php', require('./routes/admin/contributors'));

// Admin — members management
app.use('/api/admin/members', require('./routes/admin/members'));
app.use('/api/admin/reset-member-password', require('./routes/admin/members'));

// Admin — comments management
app.use('/api/admin/comments', require('./routes/admin/comments'));

// Cron endpoint (secured by CRON_SECRET)
app.post('/api/cron/send-emails', async (req, res) => {
  const secret = req.query.secret || req.headers['x-cron-secret'];
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return res.status(403).json({ status: 'error', message: 'Unauthorized' });
  }
  try {
    const MailService = require('./services/MailService');
    const mailService = MailService.getInstance(req.db);
    const [emails] = await req.db.execute(
      "SELECT id, recipient, subject, body, attempts FROM email_queue WHERE status = 'pending' ORDER BY id ASC LIMIT 12"
    );
    let sent = 0;
    for (const email of emails) {
      const attempts = email.attempts + 1;
      const ok = await mailService.sendDirect(email.recipient, email.subject, email.body);
      if (ok) {
        await req.db.execute("UPDATE email_queue SET status='sent', sent_at=CURRENT_TIMESTAMP, attempts=? WHERE id=?", [attempts, email.id]);
        sent++;
      } else {
        if (attempts >= 3) {
          await req.db.execute("UPDATE email_queue SET status='failed', attempts=?, error_message='Max attempts reached' WHERE id=?", [attempts, email.id]);
        } else {
          await req.db.execute("UPDATE email_queue SET attempts=? WHERE id=?", [attempts, email.id]);
        }
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

// ── Well-known files ───────────────────────────────────────────────────────────
// robots.txt and sitemap.xml are now generated by Next.js App Router metadata
// files (src/app/robots.js and src/app/sitemap.js). These Express routes serve
// as a fallback if Express is accessed directly (bypassing Next.js).
const canonicalUrl = (process.env.CANONICAL_URL || 'https://sap.webanatomy.in').replace(/\/$/, '');

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
      let conn;
      try {
        const { pool } = require('./db');
        conn = await pool.getConnection();
        const mailService = MailService.getInstance(conn);
        const [emails] = await conn.execute(
          "SELECT id, recipient, subject, body, attempts FROM email_queue WHERE status = 'pending' ORDER BY id ASC LIMIT 12"
        );
        let sent = 0;
        for (const email of emails) {
          const attempts = email.attempts + 1;
          const ok = await mailService.sendDirect(email.recipient, email.subject, email.body);
          if (ok) {
            await conn.execute("UPDATE email_queue SET status='sent', sent_at=CURRENT_TIMESTAMP, attempts=? WHERE id=?", [attempts, email.id]);
            sent++;
          } else if (attempts >= 3) {
            await conn.execute("UPDATE email_queue SET status='failed', attempts=?, error_message='Max attempts reached' WHERE id=?", [attempts, email.id]);
          } else {
            await conn.execute("UPDATE email_queue SET attempts=? WHERE id=?", [attempts, email.id]);
          }
        }
        if (emails.length) console.log(`[cron] Sent ${sent}/${emails.length} emails`);
      } catch (err) {
        console.error('[cron] Error:', err.message);
      } finally {
        if (conn) conn.release();
      }
    });
    console.log('[cron] In-process email queue cron started');
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
