const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const TEMPLATES_DIR = path.join(__dirname, '../templates');

let _instance = null;

class MailService {
  constructor(db) {
    this.db = db;
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

  static getInstance(db) {
    if (!_instance) _instance = new MailService(db);
    return _instance;
  }

  /** Send using an HTML template file with {{placeholder}} substitution */
  async send(to, subject, templatePath, data = {}) {
    const siteUrl = (process.env.SITE_URL || 'http://dev.sapsecurityexpert.com').replace(/\/$/, '');
    data.site_url = data.site_url || siteUrl;
    data.site_domain = data.site_domain || new URL(siteUrl).hostname;

    const fullPath = path.join(TEMPLATES_DIR, templatePath + '.html');
    let status = 'failed';
    let error = null;

    try {
      if (!fs.existsSync(fullPath)) throw new Error(`Template ${templatePath} not found`);

      let body = fs.readFileSync(fullPath, 'utf8');
      for (const [key, val] of Object.entries(data)) {
        body = body.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), String(val ?? ''));
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
      await this._logDb(to, subject, status, error);
    }
  }

  /** Send with a raw HTML body */
  async sendDirect(to, subject, body) {
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
      await this._logDb(to, subject, status, error);
    }
  }

  /** Queue new blog notifications for all opted-in members */
  async queuePendingBlogNotifications() {
    try {
      const [blogs] = await this.db.execute(
        `SELECT id, title, slug, author, category FROM blogs
         WHERE status IN ('approved','published')
           AND send_notification_email = 1
           AND (is_queued_for_members IS NULL OR is_queued_for_members = 0)`
      );
      if (!blogs.length) return;

      const [members] = await this.db.execute(
        `SELECT name, email FROM members
         WHERE status = 'approved' AND is_deleted = 0 AND receive_blog_emails = 1`
      );

      const siteUrl = (process.env.SITE_URL || 'http://dev.sapsecurityexpert.com').replace(/\/$/, '');
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

        await this.db.beginTransaction();
        try {
          // blog.id must be stored as a string — a numeric coercion in MySQL
          // would collapse all blog IDs to 0 and break the unique dedup index.
          const blogIdStr = String(blog.id);
          for (const member of members) {
            await this.db.execute(
              `INSERT IGNORE INTO email_queue (recipient, blog_id, subject, body, status, created_at)
               VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
              [member.email, blogIdStr, subject, body]
            );
          }
          await this.db.execute(
            'UPDATE blogs SET is_queued_for_members = 1 WHERE id = ?',
            [blog.id]
          );
          await this.db.commit();
        } catch (err) {
          await this.db.rollback();
          this._logFile(`Queue transaction failed for blog ${blog.id}: ${err.message}`);
        }
      }
    } catch (err) {
      this._logFile(`queuePendingBlogNotifications error: ${err.message}`);
    }
  }

  _logFile(message) {
    const dir = path.dirname(this.logFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(this.logFile, `[${new Date().toISOString()}] ${message}\n`);
  }

  async _logDb(recipient, subject, status, error) {
    try {
      await this.db.execute(
        'INSERT INTO email_logs (recipient, subject, status, error_message, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
        [recipient, subject, status, error]
      );
    } catch { /* don't crash on log failure */ }
  }
}

module.exports = MailService;
