const router = require('express').Router();
const crypto = require('crypto');
const multer = require('multer');
const { getUploadDir, verifyImageMagicBytes } = require('../utils/helpers');
const { rateLimit } = require('../middleware/rateLimit');
const { requireAdmin } = require('../middleware/auth');
const controller = require('../controllers/membersController');

// Profile image upload (members)
const profileStorage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, getUploadDir('profiles')),
  filename: (_, file, cb) => {
    const ext = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.mimetype] || 'jpg';
    cb(null, `member_profile_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`);
  },
});
const profileUpload = multer({
  storage: profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => cb(null, ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype)),
});

router.post('/login', rateLimit('member_login', 10, 900), controller.login);
router.post('/signup', rateLimit('member_signup', 10, 900), controller.signup);
router.get('/profile', controller.getProfile);
router.post('/profile/update', (req, res, next) => {
  profileUpload.single('profile_image')(req, res, (err) => {
    if (err) return res.status(400).json({ status: 'error', message: err.message });
    next();
  });
}, verifyImageMagicBytes, controller.updateProfile);
router.post('/logout', controller.logout);
router.get('/referral', controller.referral);
router.get('/achievements', controller.achievements);
router.post('/achievements/grant', requireAdmin, controller.grantAchievement);
router.post('/change-password', rateLimit('member_change_password', 5, 900), controller.changePassword);

module.exports = router;
