const router = require('express').Router();
const { requireAdmin, requireAuth } = require('../../middleware/auth');

// All routes mounted at /api — use full sub-paths to avoid mounting conflicts.

// GET /api/admin/stats
router.get('/admin/stats', requireAdmin, async (req, res) => {
  const db = req.db;
  try {
    const [[contributors]] = await db.execute("SELECT COUNT(*) AS c FROM contributors WHERE status = 'approved'");
    const [[pending_contributors]] = await db.execute("SELECT COUNT(*) AS c FROM contributors WHERE status = 'pending'");
    const [[pending_reviews]] = await db.execute("SELECT COUNT(*) AS c FROM blogs WHERE submission_status IN ('submitted','edited')");
    const [[pending_comments]] = await db.execute("SELECT COUNT(*) AS c FROM comments WHERE status = 'pending'");
    const [[total_blogs]] = await db.execute("SELECT COUNT(*) AS c FROM blogs");
    const [[approved_members]] = await db.execute("SELECT COUNT(*) AS c FROM members WHERE status = 'approved'");
    const [[pending_members]] = await db.execute("SELECT COUNT(*) AS c FROM members WHERE status = 'pending'");
    const [[views]] = await db.execute("SELECT SUM(view_count) AS total FROM blogs");

    return res.json({
      contributors: contributors.c,
      pending_contributors: pending_contributors.c,
      pending_reviews: pending_reviews.c,
      pending_comments: pending_comments.c,
      blogs: total_blogs.c,
      total_views: views.total || 0,
      approved_members: approved_members.c,
      pending_members: pending_members.c,
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// GET /api/contributor/stats
router.get('/contributor/stats', requireAuth(), async (req, res) => {
  const db = req.db;
  const userId = req.session.admin_id;
  try {
    const [[total]]     = await db.execute("SELECT COUNT(*) AS c FROM blogs WHERE author_id = ?", [userId]);
    const [[drafts]]    = await db.execute("SELECT COUNT(*) AS c FROM blogs WHERE author_id = ? AND submission_status = 'draft'", [userId]);
    const [[submitted]] = await db.execute("SELECT COUNT(*) AS c FROM blogs WHERE author_id = ? AND submission_status IN ('submitted','edited')", [userId]);
    const [[approved]]  = await db.execute("SELECT COUNT(*) AS c FROM blogs WHERE author_id = ? AND status IN ('approved','published')", [userId]);
    const [[rejected]]  = await db.execute("SELECT COUNT(*) AS c FROM blogs WHERE author_id = ? AND status = 'rejected'", [userId]);
    const [[views]]     = await db.execute("SELECT COALESCE(SUM(view_count), 0) AS total FROM blogs WHERE author_id = ?", [userId]);
    const [[comments]]  = await db.execute("SELECT COUNT(*) AS c FROM comments cm JOIN blogs b ON cm.post_id = b.id WHERE b.author_id = ?", [userId]);

    // Site-wide stats for privileged roles
    const [[pending_reviews]]    = await db.execute("SELECT COUNT(*) AS c FROM blogs WHERE submission_status IN ('submitted','edited')");
    const [[pending_comments]]   = await db.execute("SELECT COUNT(*) AS c FROM comments WHERE status = 'pending'");
    const [[rejected_comments]]  = await db.execute("SELECT COUNT(*) AS c FROM comments WHERE status = 'rejected'");
    const [[total_ads]]          = await db.execute("SELECT COUNT(*) AS c FROM ads");
    const [[total_announcements]] = await db.execute("SELECT COUNT(*) AS c FROM announcements");

    return res.json({
      total: total.c,
      drafts: drafts.c,
      submitted: submitted.c,
      approved: approved.c,
      rejected: rejected.c,
      total_views: views.total || 0,
      total_comments: comments.c,
      pending_reviews: pending_reviews.c,
      pending_comments: pending_comments.c,
      rejected_comments: rejected_comments.c,
      total_ads: total_ads.c,
      total_announcements: total_announcements.c,
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
