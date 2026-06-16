const router = require('express').Router();
const crypto = require('crypto');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { requireAuth } = require('../../middleware/auth');
const { getUploadDir } = require('../../utils/helpers');

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

// GET /api/admin/profile
// Returns the logged-in user's profile. For contributors, falls back to contributors.image
// if users.profile_image is not set, so the uploaded application photo is always shown.
router.get('/profile', requireAuth(), async (req, res) => {
  const db = req.db;
  try {
    const [rows] = await db.execute(
      `SELECT u.id, u.username, u.email, u.full_name, u.role, u.bio, u.designation, u.linkedin,
              COALESCE(u.profile_image, c.image) AS profile_image
       FROM users u
       LEFT JOIN contributors c ON u.contributor_id = c.id
       WHERE u.id = ? LIMIT 1`,
      [req.session.admin_id]
    );
    if (!rows.length) return res.status(404).json({ status: 'error', message: 'Profile not found' });
    return res.json({ status: 'success', user: rows[0] });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/admin/profile/update
// Updates profile fields + optional image. Syncs image to contributors.image so both stay in sync.
router.post('/profile/update', requireAuth(), upload.single('profile_image'), async (req, res) => {
  const db = req.db;
  const { full_name, email, bio, designation, linkedin } = req.body || {};
  try {
    const updates = ['full_name=?', 'bio=?', 'designation=?', 'linkedin=?'];
    const params = [full_name || null, bio || null, designation || null, linkedin || null];

    if (email) { updates.push('email=?'); params.push(email); }

    let profileImage = null;
    if (req.file) {
      profileImage = '/uploads/profiles/' + req.file.filename;
      updates.push('profile_image=?');
      params.push(profileImage);
    }

    params.push(req.session.admin_id);
    await db.execute(`UPDATE users SET ${updates.join(',')} WHERE id=?`, params);

    // Sync profile image across all related tables (contributors + member account with same email)
    if (profileImage) {
      await db.execute(
        'UPDATE contributors SET image=? WHERE id=(SELECT contributor_id FROM users WHERE id=?)',
        [profileImage, req.session.admin_id]
      ).catch(() => {});

      // Also sync to members table so the member portal shows the same photo
      await db.execute(
        'UPDATE members SET profile_image=? WHERE LOWER(email)=(SELECT LOWER(email) FROM users WHERE id=?)',
        [profileImage, req.session.admin_id]
      ).catch(() => {});
    }

    const [rows] = await db.execute(
      `SELECT u.id, u.username, u.email, u.full_name, u.role,
              COALESCE(u.profile_image, c.image) AS profile_image
       FROM users u LEFT JOIN contributors c ON u.contributor_id = c.id
       WHERE u.id=?`,
      [req.session.admin_id]
    );
    return res.json({ status: 'success', message: 'Profile updated', user: rows[0] });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/admin/reset-password
// Changes own password. Syncs new hash to members table so contributor/member login stays in sync.
router.post('/reset-password', requireAuth(), async (req, res) => {
  const db = req.db;
  const { current_password, new_password } = req.body || {};
  if (!current_password || !new_password) {
    return res.status(400).json({ status: 'error', message: 'Both current and new passwords are required.' });
  }
  try {
    const [rows] = await db.execute('SELECT email, password FROM users WHERE id = ?', [req.session.admin_id]);
    if (!rows.length) return res.status(404).json({ status: 'error', message: 'User not found' });

    const match = await bcrypt.compare(current_password, rows[0].password);
    if (!match) return res.status(400).json({ status: 'error', message: 'Current password is incorrect.' });

    const hash = await bcrypt.hash(new_password, 10);

    // Update users table
    await db.execute('UPDATE users SET password=? WHERE id=?', [hash, req.session.admin_id]);

    // Sync to members table — same person, one password
    await db.execute(
      'UPDATE members SET password_hash=? WHERE LOWER(email)=LOWER(?)',
      [hash, rows[0].email]
    ).catch(() => {});

    return res.json({ status: 'success', message: 'Password changed successfully.' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
