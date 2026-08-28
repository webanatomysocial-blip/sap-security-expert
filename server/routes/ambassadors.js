const router = require('express').Router();
const multer = require('multer');
const crypto = require('crypto');
const { getUploadDir, verifyImageMagicBytes } = require('../utils/helpers');
const { rateLimit } = require('../middleware/rateLimit');
const controller = require('../controllers/ambassadorsPublicController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, getUploadDir('ambassadors')),
  filename: (req, file, cb) => {
    const ext = file.mimetype.split('/')[1].replace('jpeg', 'jpg');
    cb(null, `ambassador_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    cb(null, allowed.includes(file.mimetype));
  },
});

router.post('/apply', rateLimit('ambassador_apply', 5, 3600), upload.single('profilePhoto'), verifyImageMagicBytes, controller.apply);
router.get('/approved', controller.listApproved);
router.get('/profile/:id', controller.getProfile);

module.exports = router;
