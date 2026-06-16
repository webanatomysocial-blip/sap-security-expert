/**
 * Standalone cron runner — processes the email queue every minute.
 * Run with: node cron.js
 * Or use node-cron inside the same process if preferred.
 */
require('dotenv').config({ path: __dirname + '/.env' });
const cron = require('node-cron');
const { pool } = require('./db');
const MailService = require('./services/MailService');

async function processEmailQueue() {
  let conn;
  try {
    conn = await pool.getConnection();
    const mailService = MailService.getInstance(conn);

    const [emails] = await conn.execute(
      "SELECT id, recipient, subject, body, attempts FROM email_queue WHERE status = 'pending' ORDER BY id ASC LIMIT 12"
    );

    if (!emails.length) return;

    let sent = 0;
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      const attempts = email.attempts + 1;
      const ok = await mailService.sendDirect(email.recipient, email.subject, email.body);

      if (ok) {
        await conn.execute(
          "UPDATE email_queue SET status='sent', sent_at=CURRENT_TIMESTAMP, attempts=? WHERE id=?",
          [attempts, email.id]
        );
        sent++;
      } else {
        if (attempts >= 3) {
          await conn.execute(
            "UPDATE email_queue SET status='failed', attempts=?, error_message='Max attempts reached' WHERE id=?",
            [attempts, email.id]
          );
        } else {
          await conn.execute("UPDATE email_queue SET attempts=? WHERE id=?", [attempts, email.id]);
        }
      }

      // 5-second delay between emails to respect AWS SES rate limits
      if (i < emails.length - 1) await new Promise(r => setTimeout(r, 5000));
    }

    console.log(`[cron] Sent ${sent}/${emails.length} emails`);
  } catch (err) {
    console.error('[cron] Error:', err.message);
  } finally {
    if (conn) conn.release();
  }
}

// Run every minute
cron.schedule('* * * * *', processEmailQueue);
console.log('[cron] Email queue processor started (runs every minute)');
