const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const crypto = require('crypto');
const { requireMemberAuth, requireCsrf } = require('../middleware/auth');
const { personalizePdf } = require('../services/pdfWatermark');
const { rateLimit } = require('../middleware/rateLimit');
const { hasActiveMembership } = require('../repositories/paymentsRepository');

const ROOT = path.join(__dirname, '../..');
const PRIVATE_DIR = path.join(__dirname, '../private-downloads');

// Resolve a stored file_url to an absolute disk path.
// private://filename  → server/private-downloads/filename  (PDFs, never web-accessible)
// /uploads/downloads/filename → public/uploads/downloads/filename
function resolvePath(fileUrl) {
  if (fileUrl.startsWith('private://')) {
    const filename = path.basename(fileUrl.slice('private://'.length));
    return path.join(PRIVATE_DIR, filename);
  }
  const filename = path.basename(fileUrl);
  return path.join(ROOT, 'public/uploads/downloads', filename);
}

function logAccess(db, memberId, fileUrl, action, req, success) {
  if (!db) return;
  const ip = req.ip || null;
  const ua = (req.headers['user-agent'] || '').slice(0, 500) || null;
  db.execute(
    'INSERT INTO document_access_log (member_id, file_url, action, ip_address, user_agent, success) VALUES (?, ?, ?, ?, ?, ?)',
    [memberId, fileUrl, action, ip, ua, success ? 1 : 0]
  ).catch(() => {});
}

// GET /api/downloads/stream?token=xxx
// Validates a one-time session token issued by POST /payments/download-file
// or POST /api/downloads/token. Consuming the token makes the URL single-use
// so pasting/sharing it returns 403.
// PDFs are personalized with a member watermark + footer before delivery.
router.get('/stream', requireMemberAuth, rateLimit('pdf_stream', 20, 300), async (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(403).send('Access denied: missing token.');

  const tokens = req.session.dl_tokens || {};
  const entry = tokens[token];

  if (!entry || Date.now() > entry.expires) {
    delete req.session.dl_tokens?.[token];
    return res.status(403).send('Download link has expired or is invalid. Please use the Download button on the blog page.');
  }

  // Consume — one-time use
  delete req.session.dl_tokens[token];
  req.session.save(() => {});

  const fileUrl = entry.url;
  const fileName = path.basename(fileUrl);
  const filePath = resolvePath(fileUrl);

  if (!fs.existsSync(filePath)) {
    logAccess(req.db, req.session.member_id, fileUrl, 'download', req, false);
    return res.status(404).send('File not found.');
  }

  const isPdf = /\.pdf$/i.test(fileName);

  if (!isPdf) {
    // Non-PDF: pass through unchanged
    logAccess(req.db, req.session.member_id, fileUrl, 'download', req, true);
    return res.download(filePath, fileName);
  }

  // PDF: inject member watermark + footer
  try {
    const member = {
      id: req.session.member_id,
      name: req.session.member_name || 'Member',
    };

    const rawBuffer = await fsp.readFile(filePath);
    const personalizedBuffer = await personalizePdf(rawBuffer, member);

    // Deliver personalized PDF inline (view) or as attachment (download)
    const disposition = entry.action === 'view' ? 'inline' : 'attachment';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${fileName}"`);
    res.setHeader('Content-Length', personalizedBuffer.length);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    logAccess(req.db, req.session.member_id, fileUrl, entry.action || 'download', req, true);
    return res.end(personalizedBuffer);
  } catch (err) {
    console.error('[pdf_watermark]', err.message);
    logAccess(req.db, req.session.member_id, fileUrl, 'download', req, false);
    // Fallback: serve raw PDF rather than failing completely
    return res.download(filePath, fileName);
  }
});

// POST /api/downloads/token
// Issues a fresh one-time token for a file the member has already paid for.
// Used by the "Downloads" tab in /member/credits for re-downloading.
router.post('/token', requireMemberAuth, requireCsrf, async (req, res) => {
  const { file_url, action } = req.body || {};
  const validUrl = typeof file_url === 'string' &&
    (file_url.startsWith('/uploads/downloads/') || file_url.startsWith('private://'));
  if (!file_url || !validUrl) {
    return res.status(400).json({ status: 'error', message: 'Invalid file URL.' });
  }

  const [rows] = await req.db.execute(
    'SELECT id, source FROM member_file_downloads WHERE member_id = ? AND file_url = ?',
    [req.session.member_id, file_url]
  );
  if (rows.length === 0) {
    return res.status(403).json({ status: 'error', message: 'Access denied.' });
  }
  if (rows[0].source === 'membership' && !await hasActiveMembership(req.db, req.session.member_id)) {
    return res.status(402).json({ status: 'error', message: 'Your membership has expired. Renew it or download again with credits.', reason: 'membership_expired' });
  }

  const tokenAction = action === 'view' ? 'view' : 'download';
  const token = crypto.randomBytes(24).toString('hex');
  if (!req.session.dl_tokens) req.session.dl_tokens = {};
  // view: 5 min expiry; download: 10 min expiry (per spec)
  const expiry = tokenAction === 'view' ? 5 * 60_000 : 10 * 60_000;
  req.session.dl_tokens[token] = { url: file_url, action: tokenAction, expires: Date.now() + expiry };

  return res.json({ status: 'success', token });
});

module.exports = router;
