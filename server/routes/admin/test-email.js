const router = require('express').Router();
const { requireAdmin } = require('../../middleware/auth');
const MailService = require('../../services/MailService');

// POST /api/admin/test-email — send a test email to the configured admin address
router.post('/', requireAdmin, async (req, res) => {
  const adminEmail = process.env.ADMIN_EMAIL || 'hello@sapsecurityexpert.com';
  const mail = MailService.getInstance(req.db);

  const sent = await mail.sendDirect(
    adminEmail,
    '✅ Test Email — SAP Security Expert',
    `<p>This is a test email sent at <strong>${new Date().toISOString()}</strong>.</p>
     <p>If you received this, admin email delivery is working correctly.</p>
     <p>Configured admin email: <strong>${adminEmail}</strong></p>`
  );

  if (!sent) {
    return res.status(500).json({ status: 'error', message: `Failed to send email to ${adminEmail}. Check server SMTP config.` });
  }

  return res.json({ status: 'success', message: `Test email sent to ${adminEmail}` });
});

module.exports = router;
