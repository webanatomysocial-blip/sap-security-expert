const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { requireMemberAuth, requireCsrf } = require('../middleware/auth');

const ROOT = path.join(__dirname, '../..');

// GET /api/downloads/stream?token=xxx
// Validates a one-time session token issued by POST /payments/download-file
// or POST /api/downloads/token. Consuming the token makes the URL single-use
// so pasting/sharing it returns 403.
router.get('/stream', requireMemberAuth, (req, res) => {
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
  const filePath = path.join(ROOT, 'public/uploads/downloads', fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found.');
  }

  res.download(filePath, fileName);
});

// POST /api/downloads/token
// Issues a fresh one-time token for a file the member has already paid for.
// Used by the "Downloads" tab in /member/credits for re-downloading.
router.post('/token', requireMemberAuth, requireCsrf, async (req, res) => {
  const { file_url } = req.body || {};
  if (!file_url || typeof file_url !== 'string' || !file_url.startsWith('/uploads/downloads/')) {
    return res.status(400).json({ status: 'error', message: 'Invalid file URL.' });
  }

  const [rows] = await req.db.execute(
    'SELECT id FROM member_file_downloads WHERE member_id = ? AND file_url = ?',
    [req.session.member_id, file_url]
  );
  if (rows.length === 0) {
    return res.status(403).json({ status: 'error', message: 'Access denied.' });
  }

  const token = crypto.randomBytes(24).toString('hex');
  if (!req.session.dl_tokens) req.session.dl_tokens = {};
  req.session.dl_tokens[token] = { url: file_url, expires: Date.now() + 60_000 };

  return res.json({ status: 'success', token });
});

module.exports = router;
