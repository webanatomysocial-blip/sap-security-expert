const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { poolExec, pool, isSQLite } = require('../db');

const TEMPLATES_DIR = path.join(__dirname, '../templates');

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

let _instance = null;

class MailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    this.from = `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM}>`;
    this.logFile = path.join(__dirname, '../logs/mail.log');
  }

  // Fix #3: db is never stored on the instance — passed per-call so concurrent
  // requests can't interfere with each other's logging connection.
  static getInstance() {
    if (!_instance) _instance = new MailService();
    return _instance;
  }

  /** Send using an HTML template file with {{placeholder}} substitution */
  async send(db, to, subject, templatePath, data = {}) {
    const siteUrl = (process.env.SITE_URL || 'http://sapsecurityexpert.com').replace(/\/$/, '');
    data.site_url = data.site_url || siteUrl;
    data.site_domain = data.site_domain || new URL(siteUrl).hostname;

    const fullPath = path.join(TEMPLATES_DIR, templatePath + '.html');
    let status = 'failed';
    let error = null;

    try {
      if (!fs.existsSync(fullPath)) throw new Error(`Template ${templatePath} not found`);

      let body = fs.readFileSync(fullPath, 'utf8');
      for (const [key, val] of Object.entries(data)) {
        // Escape before interpolation — several templates substitute
        // user-submitted fields (name, reason, etc.) straight from public
        // forms, and this is HTML, not React, so nothing escapes it for us.
        body = body.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), escapeHtml(String(val ?? '')));
      }

      await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        html: body,
        text: body.replace(/<[^>]+>/g, ''),
      });

      status = 'sent';
      this._logFile(`Mail sent to ${to}: ${subject}`);
      return true;
    } catch (err) {
      error = err.message;
      this._logFile(`Mail Error to ${to}: ${error}`);
      return false;
    } finally {
      await this._logDb(db, to, subject, status, error);
    }
  }

  /** Send with a raw HTML body */
  async sendDirect(db, to, subject, body) {
    let status = 'failed';
    let error = null;
    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        html: body,
        text: body.replace(/<[^>]+>/g, ''),
      });
      status = 'sent';
      return true;
    } catch (err) {
      error = err.message;
      return false;
    } finally {
      await this._logDb(db, to, subject, status, error);
    }
  }

  // Fix #2: Queue a transactional email (OTP, password reset, approval) so it
  // gets retried automatically if SMTP is temporarily unavailable.
  async queueTransactional(db, to, subject, body) {
    try {
      await db.execute(
        `INSERT INTO email_queue (recipient, blog_id, subject, body, status, created_at)
         VALUES (?, NULL, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
        [to, subject, body]
      );
      return true;
    } catch (err) {
      this._logFile(`queueTransactional failed for ${to}: ${err.message}`);
      return false;
    }
  }

  /** Queue new blog notifications for all opted-in members */
  async queuePendingBlogNotifications() {
    // Gets its own connection from the pool — never uses the caller's req.db.
    // The caller fires this as .catch(()=>{}) and returns res.json() immediately,
    // which releases req.db back to the pool. Using req.db here would run queries
    // on an already-released connection, wedging it and exhausting the pool.
    const conn = isSQLite ? poolExec : await pool.getConnection();
    try {
      const [blogs] = await conn.execute(
        `SELECT id, title, slug, author, category FROM blogs
         WHERE status IN ('approved','published')
           AND send_notification_email = 1
           AND (is_queued_for_members IS NULL OR is_queued_for_members = 0)`
      );
      if (!blogs.length) return;

      const [members] = await conn.execute(
        `SELECT name, email FROM members
         WHERE status = 'approved' AND is_deleted = 0 AND receive_blog_emails = 1`
      );

      const siteUrl = (process.env.SITE_URL || 'http://sapsecurityexpert.com').replace(/\/$/, '');
      const templatePath = path.join(TEMPLATES_DIR, 'member/new_article.html');

      for (const blog of blogs) {
        const categorySlug = (blog.category || 'others').toLowerCase().replace(/ /g, '-');
        const postUrl = `${siteUrl}/${categorySlug}/${blog.slug}`;
        const authorName = blog.author || 'Editorial team';
        const subject = `New Article: ${blog.title}`;

        let body = '';
        if (fs.existsSync(templatePath)) {
          body = fs.readFileSync(templatePath, 'utf8')
            .replace(/\{\{\s*article_title\s*\}\}/g, blog.title)
            .replace(/\{\{\s*author_name\s*\}\}/g, authorName)
            .replace(/\{\{\s*article_url\s*\}\}/g, postUrl)
            .replace(/\{\{\s*site_url\s*\}\}/g, siteUrl)
            .replace(/\{\{\s*site_domain\s*\}\}/g, new URL(siteUrl).hostname);
        } else {
          body = `<p>New article: <strong>${blog.title}</strong> by ${authorName}. Read it at <a href="${postUrl}">${postUrl}</a></p>`;
        }

        await conn.beginTransaction();
        try {
          const blogIdStr = String(blog.id);
          for (const member of members) {
            await conn.execute(
              `INSERT IGNORE INTO email_queue (recipient, blog_id, subject, body, status, created_at)
               VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
              [member.email, blogIdStr, subject, body]
            );
          }
          await conn.execute(
            'UPDATE blogs SET is_queued_for_members = 1 WHERE id = ?',
            [blog.id]
          );
          await conn.commit();
        } catch (err) {
          await conn.rollback();
          this._logFile(`Queue transaction failed for blog ${blog.id}: ${err.message}`);
        }
      }
    } catch (err) {
      this._logFile(`queuePendingBlogNotifications error: ${err.message}`);
    } finally {
      if (!isSQLite) conn.release();
    }
  }

  _logFile(message) {
    const dir = path.dirname(this.logFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(this.logFile, `[${new Date().toISOString()}] ${message}\n`);
  }

  // Deliberately ignores the `db` argument (kept for call-site compatibility —
  // send()/sendDirect() still accept it) and always writes via poolExec
  // instead. This log write commonly runs after the caller's HTTP response
  // has already finished (fire-and-forget notification calls that aren't
  // awaited before res.json(...)), at which point dbMiddleware has already
  // released the caller's connection back to the pool. Writing on that
  // already-released connection races whatever request the pool hands it to
  // next — two unrelated queries on one physical connection at once, which
  // desyncs mysql2's protocol state (surfaces in MySQL as "Aborted
  // connection ... Got an error reading communication packets"). poolExec
  // acquires its own short-lived connection per call, independent of
  // whatever the caller's connection is doing.
  async _logDb(_db, recipient, subject, status, error) {
    try {
      await poolExec.execute(
        'INSERT INTO email_logs (recipient, subject, status, error_message, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
        [recipient, subject, status, error]
      );
    } catch { /* don't crash on log failure */ }
  }
}

module.exports = MailService;
