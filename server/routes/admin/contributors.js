const router = require('express').Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { requireAdmin } = require('../../middleware/auth');
const { deleteImage } = require('../../utils/helpers');
const NotificationService = require('../../services/NotificationService');
const MailService = require('../../services/MailService');

// All routes here are mounted at /api/admin, so paths are relative to that.

// ── GET /api/admin/contributors ───────────────────────────────────────────────
router.get('/contributors', requireAdmin, async (req, res) => {
  const db = req.db;
  try {
    const [rows] = await db.execute(
      `SELECT c.*,
              c.full_name AS name,
              c.image     AS profile_image,
              u.id        AS user_id,
              u.username,
              u.is_active,
              u.email     AS user_email
       FROM contributors c
       LEFT JOIN users u ON u.contributor_id = c.id
       WHERE c.is_deleted = 0 OR c.is_deleted IS NULL
       ORDER BY c.created_at DESC`
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// ── POST /api/admin/contributors ─ approve / reject / delete ──────────────────
router.post('/contributors', requireAdmin, async (req, res) => {
  const db = req.db;
  const body = req.body || {};
  const id = body.id;
  const reason = body.reason || body.rejection_reason || '';
  const raw = (body.action || body.status || '').toLowerCase();
  const ACTION = { approved: 'approve', approve: 'approve', rejected: 'reject', reject: 'reject', deleted: 'delete', delete: 'delete' };
  const normalised = ACTION[raw];

  if (!id || !normalised) return res.status(400).json({ status: 'error', message: 'id and action are required' });

  try {
    const [rows] = await db.execute('SELECT * FROM contributors WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ status: 'error', message: 'Contributor not found' });
    const contributor = rows[0];

    const mailService = MailService.getInstance(db);
    const notifier = new NotificationService(mailService);

    if (normalised === 'approve') {
      await db.execute("UPDATE contributors SET status='approved' WHERE id=?", [id]);

      const [existingUser] = await db.execute("SELECT id FROM users WHERE LOWER(email)=LOWER(?)", [contributor.email]);
      let password = null;

      if (!existingUser.length) {
        password = crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
        const hash = await bcrypt.hash(password, 10);
        const username = contributor.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + Date.now().toString().slice(-4);
        await db.execute(
          `INSERT INTO users (username, email, password, role, full_name, is_active, contributor_id, created_at)
           VALUES (?, ?, ?, 'contributor', ?, 1, ?, CURRENT_TIMESTAMP)`,
          [username, contributor.email, hash, contributor.full_name, id]
        );
      } else {
        await db.execute("UPDATE users SET is_active=1, contributor_id=? WHERE LOWER(email)=LOWER(?)", [id, contributor.email]);
      }

      // Ensure contributor has a member record so they can log into the member portal
      const memberName = contributor.full_name || contributor.email.split('@')[0];
      const [memCheck] = await db.execute(
        'SELECT id FROM members WHERE LOWER(email)=LOWER(?) LIMIT 1', [contributor.email]
      ).catch(() => [[]]);
      if (!memCheck.length) {
        // No member record yet — fetch the hash from users and create one
        const [uRow] = await db.execute('SELECT password FROM users WHERE LOWER(email)=LOWER(?) LIMIT 1', [contributor.email]).catch(() => [[]]);
        const memberHash = password ? await bcrypt.hash(password, 10) : uRow[0]?.password;
        if (memberHash) {
          await db.execute(
            "INSERT INTO members (name, email, password_hash, status, approved_at) VALUES (?, ?, ?, 'approved', CURRENT_TIMESTAMP)",
            [memberName, contributor.email, memberHash]
          ).catch(() => {});
        }
      } else if (password) {
        // Member exists — keep password in sync
        const approveHash = await bcrypt.hash(password, 10);
        await db.execute('UPDATE members SET password_hash=? WHERE LOWER(email)=LOWER(?)', [approveHash, contributor.email]).catch(() => {});
      }

      notifier.notifyContributorApproved(contributor.email, contributor.full_name, { password }).catch(() => {});
      return res.json({ status: 'success', message: 'Contributor approved.' });

    } else if (normalised === 'reject') {
      await db.execute("UPDATE contributors SET status='rejected' WHERE id=?", [id]);
      notifier.notifyContributorRejected(contributor.email, contributor.full_name, reason || 'Application not approved.').catch(() => {});
      return res.json({ status: 'success', message: 'Contributor rejected.' });

    } else if (normalised === 'delete') {
      if (contributor.image) deleteImage(contributor.image);
      // Detach user account from contributor profile — user keeps their account as a regular member
      await db.execute(
        "UPDATE users SET contributor_id=NULL, role='member' WHERE contributor_id=?",
        [id]
      ).catch(() => {});
      await db.execute('DELETE FROM contributors WHERE id=?', [id]);
      return res.json({ status: 'success', message: 'Contributor deleted. User account preserved as member.' });

    } else {
      return res.status(400).json({ status: 'error', message: 'Unknown action' });
    }
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// ── GET /api/admin/contributor-login?contributor_id=X ────────────────────────
// Returns { has_login, user_id, is_active, permissions } — shape expected by ManageContributorModal
router.get('/contributor-login', requireAdmin, async (req, res) => {
  const db = req.db;
  const { contributor_id } = req.query;
  if (!contributor_id) return res.status(400).json({ status: 'error', message: 'contributor_id required' });

  try {
    const [rows] = await db.execute(
      'SELECT id, username, email, is_active FROM users WHERE contributor_id = ? LIMIT 1',
      [contributor_id]
    );

    if (!rows.length) return res.json({ has_login: false });

    const user = rows[0];
    const [permRows] = await db.execute('SELECT * FROM user_permissions WHERE user_id = ? LIMIT 1', [user.id]);
    const permissions = permRows.length ? {
      can_manage_blogs: !!permRows[0].can_manage_blogs,
      can_manage_ads: !!permRows[0].can_manage_ads,
      can_manage_comments: !!permRows[0].can_manage_comments,
      can_manage_announcements: !!permRows[0].can_manage_announcements,
      can_review_blogs: !!(permRows[0].can_review_blogs || 0),
      can_access_premium_articles: !!(permRows[0].can_access_premium_articles || 0),
    } : {};

    return res.json({ has_login: true, user_id: user.id, is_active: !!user.is_active, permissions });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// ── POST /api/admin/create-contributor-login ──────────────────────────────────
// Creates a user account. Generates password server-side, sends it via email,
// and returns it so the modal can display it — ensuring email and modal match.
router.post('/create-contributor-login', requireAdmin, async (req, res) => {
  const db = req.db;
  const { contributor_id, permissions } = req.body || {};
  if (!contributor_id) return res.status(400).json({ status: 'error', message: 'contributor_id required' });

  try {
    const [contRows] = await db.execute('SELECT * FROM contributors WHERE id = ?', [contributor_id]);
    if (!contRows.length) return res.status(404).json({ status: 'error', message: 'Contributor not found' });
    const contributor = contRows[0];

    // Generate a secure random password server-side
    const password = crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
    const hash = await bcrypt.hash(password, 10);
    const username = contributor.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + Date.now().toString().slice(-4);

    const [existingUser] = await db.execute("SELECT id FROM users WHERE LOWER(email)=LOWER(?)", [contributor.email]);
    let userId;

    if (!existingUser.length) {
      const [result] = await db.execute(
        `INSERT INTO users (username, email, password, role, full_name, is_active, contributor_id, created_at)
         VALUES (?, ?, ?, 'contributor', ?, 1, ?, CURRENT_TIMESTAMP)`,
        [username, contributor.email, hash, contributor.full_name, contributor_id]
      );
      userId = result.insertId;
    } else {
      userId = existingUser[0].id;
      await db.execute('UPDATE users SET password=?, is_active=1, contributor_id=? WHERE id=?', [hash, contributor_id, userId]);
    }

    // Save permissions
    if (permissions) {
      const [existingPerm] = await db.execute('SELECT id FROM user_permissions WHERE user_id=?', [userId]);
      if (existingPerm.length) {
        await db.execute(
          `UPDATE user_permissions SET can_manage_blogs=?, can_manage_ads=?, can_manage_comments=?,
           can_manage_announcements=?, can_review_blogs=?, can_access_premium_articles=? WHERE user_id=?`,
          [permissions.can_manage_blogs ? 1 : 0, permissions.can_manage_ads ? 1 : 0,
           permissions.can_manage_comments ? 1 : 0, permissions.can_manage_announcements ? 1 : 0,
           permissions.can_review_blogs ? 1 : 0, permissions.can_access_premium_articles ? 1 : 0, userId]
        );
      } else {
        await db.execute(
          `INSERT INTO user_permissions (user_id, can_manage_blogs, can_manage_ads, can_manage_comments, can_manage_announcements, can_review_blogs, can_access_premium_articles)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [userId, permissions.can_manage_blogs ? 1 : 0, permissions.can_manage_ads ? 1 : 0,
           permissions.can_manage_comments ? 1 : 0, permissions.can_manage_announcements ? 1 : 0,
           permissions.can_review_blogs ? 1 : 0, permissions.can_access_premium_articles ? 1 : 0]
        );
      }
    }

    // Send email with the contributor's email as login and the generated password
    const mailService = MailService.getInstance(db);
    const notifier = new NotificationService(mailService);
    notifier.notifyContributorApproved(contributor.email, contributor.full_name, { password }).catch(() => {});

    // Ensure contributor has a member record so they can log into the member portal
    const memberName = contributor.full_name || contributor.email.split('@')[0];
    const [memCheck2] = await db.execute(
      'SELECT id FROM members WHERE LOWER(email)=LOWER(?) LIMIT 1', [contributor.email]
    ).catch(() => [[]]);
    if (!memCheck2.length) {
      await db.execute(
        "INSERT INTO members (name, email, password_hash, status, approved_at) VALUES (?, ?, ?, 'approved', CURRENT_TIMESTAMP)",
        [memberName, contributor.email, hash]
      ).catch(() => {});
    } else {
      await db.execute('UPDATE members SET password_hash=? WHERE LOWER(email)=LOWER(?)', [hash, contributor.email]).catch(() => {});
    }

    return res.json({
      status: 'success',
      message: 'Login credentials created.',
      username: contributor.email,
      password,
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// ── POST /api/admin/update-contributor-access ─────────────────────────────────
router.post('/update-contributor-access', requireAdmin, async (req, res) => {
  const db = req.db;
  const { user_id, is_active, permissions } = req.body || {};
  if (!user_id) return res.status(400).json({ status: 'error', message: 'user_id required' });
  try {
    await db.execute('UPDATE users SET is_active=? WHERE id=?', [is_active ? 1 : 0, user_id]);

    if (permissions) {
      const [existing] = await db.execute('SELECT id FROM user_permissions WHERE user_id=?', [user_id]);
      if (existing.length) {
        await db.execute(
          `UPDATE user_permissions SET can_manage_blogs=?, can_manage_ads=?, can_manage_comments=?,
           can_manage_announcements=?, can_review_blogs=?, can_access_premium_articles=? WHERE user_id=?`,
          [permissions.can_manage_blogs ? 1 : 0, permissions.can_manage_ads ? 1 : 0,
           permissions.can_manage_comments ? 1 : 0, permissions.can_manage_announcements ? 1 : 0,
           permissions.can_review_blogs ? 1 : 0, permissions.can_access_premium_articles ? 1 : 0, user_id]
        );
      } else {
        await db.execute(
          `INSERT INTO user_permissions (user_id, can_manage_blogs, can_manage_ads, can_manage_comments, can_manage_announcements, can_review_blogs, can_access_premium_articles)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [user_id, permissions.can_manage_blogs ? 1 : 0, permissions.can_manage_ads ? 1 : 0,
           permissions.can_manage_comments ? 1 : 0, permissions.can_manage_announcements ? 1 : 0,
           permissions.can_review_blogs ? 1 : 0, permissions.can_access_premium_articles ? 1 : 0]
        );
      }
    }
    return res.json({ status: 'success', message: 'Access updated.' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// ── POST /api/admin/reset-contributor-password ────────────────────────────────
// Modal sends { user_id }. Returns { new_password } for display.
router.post('/reset-contributor-password', requireAdmin, async (req, res) => {
  const db = req.db;
  const { user_id } = req.body || {};
  if (!user_id) return res.status(400).json({ status: 'error', message: 'user_id required' });
  try {
    const newPassword = crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
    const hash = await bcrypt.hash(newPassword, 10);
    await db.execute('UPDATE users SET password=? WHERE id=?', [hash, user_id]);

    // Sync the new password to members table too (same person, one password)
    const [userRows] = await db.execute('SELECT email FROM users WHERE id=?', [user_id]);
    if (userRows.length) {
      await db.execute(
        'UPDATE members SET password_hash=? WHERE LOWER(email)=LOWER(?)',
        [hash, userRows[0].email]
      ).catch(() => {});
    }

    return res.json({ status: 'success', message: 'Password reset.', new_password: newPassword });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// ── POST /api/delete_contributor.php (legacy path) ───────────────────────────
router.post('/delete-contributor', requireAdmin, async (req, res) => {
  const db = req.db;
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ status: 'error', message: 'ID required' });

  try {
    const [rows] = await db.execute(
      `SELECT c.*, COALESCE(u.email, c.email) AS contact_email
       FROM contributors c
       LEFT JOIN users u ON u.contributor_id = c.id
       WHERE c.id = ?`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ status: 'error', message: 'Contributor not found' });
    const contributor = rows[0];
    const email = contributor.contact_email || contributor.email;

    const mailService = MailService.getInstance(db);
    const notifier = new NotificationService(mailService);

    if (contributor.image) deleteImage(contributor.image);
    // Detach user — they keep their account as a regular member
    await db.execute(
      "UPDATE users SET contributor_id=NULL, role='member' WHERE contributor_id=?",
      [id]
    ).catch(() => {});
    await db.execute('DELETE FROM contributors WHERE id=?', [id]);

    notifier.notifyContributorDowngradedToMember(email, contributor.full_name).catch(() => {});
    return res.json({ status: 'success', message: 'Contributor deleted. Account preserved as member.' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
