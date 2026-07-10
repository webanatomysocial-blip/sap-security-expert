const router = require('express').Router();
const crypto = require('crypto');
const multer = require('multer');
const { requireAuth } = require('../../middleware/auth');
const { getUploadDir, verifyImageMagicBytes } = require('../../utils/helpers');
const controller = require('../../controllers/admin/profileController');

// File upload for profile images
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, getUploadDir('profiles')),
  filename: (_, file, cb) => {
    const ext = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.mimetype] || 'jpg';
    cb(null, `profile_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    cb(null, ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype));
  },
});

// All routes are mounted at /api/admin — use full sub-paths.
router.get('/profile', requireAuth(), controller.getProfile);
router.post('/profile/update', requireAuth(), upload.single('profile_image'), verifyImageMagicBytes, controller.updateProfile);
router.post('/reset-password', requireAuth(), controller.resetPassword);

module.exports = router;
