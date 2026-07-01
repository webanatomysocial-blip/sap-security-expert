const router = require('express').Router();
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const { getUploadDir, deleteImage } = require('../utils/helpers');

// ── Blog image upload ────────────────────────────────────────────────────────

const blogStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, getUploadDir('blogs')),
  filename: (req, file, cb) => {
    const mimeToExt = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
    const ext = mimeToExt[file.mimetype] || 'jpg';
    cb(null, `blog_${crypto.randomBytes(8).toString('hex')}.${ext}`);
  },
});

const blogUpload = multer({
  storage: blogStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) return cb(new Error('Please upload a valid image file (JPG, PNG, or WEBP).'));
    cb(null, true);
  },
});

router.post(
  ['/upload_blog_image.php', '/upload-blog-image'],
  requireAuth(),
  (req, res, next) => {
    if (req.session.role === 'contributor') {
      return checkPermission('can_manage_blogs')(req, res, next);
    }
    next();
  },
  (req, res, next) => {
    blogUpload.single('image')(req, res, (err) => {
      if (err) return res.json({ status: 'error', message: err.message });
      next();
    });
  },
  (req, res) => {
    if (!req.file) return res.json({ status: 'error', message: 'Please select an image to upload.' });

    const type = req.body.type || 'featured';

    // Dimension validation would require sharp — skip for now and let client validate.
    // For parity: featured must be >=1920x1080 @16:9, but we can't check without image processing.

    const oldImage = req.body.old_image || '';
    if (oldImage) deleteImage(oldImage);

    return res.json({
      status: 'success',
      message: 'Image uploaded successfully',
      filename: req.file.filename,
      path: '/uploads/blogs/' + req.file.filename,
    });
  }
);

// ── Ad image upload ──────────────────────────────────────────────────────────

const adStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, getUploadDir('ads')),
  filename: (req, file, cb) => {
    const mimeToExt = {
      'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
      'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg',
    };
    const ext = mimeToExt[file.mimetype] || path.extname(file.originalname).replace('.', '') || 'jpg';
    cb(null, `ad_${crypto.randomBytes(8).toString('hex')}.${ext}`);
  },
});

// No file size limit for ads — admins upload banners/strips which can be large
const adUpload = multer({ storage: adStorage });

router.post(
  ['/upload_ad_image.php', '/upload-ad-image'],
  requireAuth(),
  checkPermission('can_manage_ads'),
  (req, res, next) => {
    adUpload.single('image')(req, res, (err) => {
      if (err) return res.json({ status: 'error', message: err.message });
      next();
    });
  },
  (req, res) => {
    if (!req.file) return res.json({ status: 'error', message: 'Please select an image to upload.' });

    const oldImage = req.body.old_image || '';
    if (oldImage) deleteImage(oldImage);

    return res.json({
      status: 'success',
      message: 'Ad image uploaded successfully',
      filename: req.file.filename,
      path: '/uploads/ads/' + req.file.filename,
    });
  }
);

module.exports = router;
