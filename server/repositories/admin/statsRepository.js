async function getAdminStats(db) {
  const [[contributors]] = await db.execute("SELECT COUNT(*) AS c FROM contributors WHERE status = 'approved'");
  const [[pending_contributors]] = await db.execute("SELECT COUNT(*) AS c FROM contributors WHERE status = 'pending'");
  const [[pending_reviews]] = await db.execute("SELECT COUNT(*) AS c FROM blogs WHERE submission_status IN ('submitted','edited')");
  const [[pending_comments]] = await db.execute("SELECT COUNT(*) AS c FROM comments WHERE status = 'pending'");
  const [[total_blogs]] = await db.execute("SELECT COUNT(*) AS c FROM blogs");
  const [[approved_members]] = await db.execute("SELECT COUNT(*) AS c FROM members WHERE status = 'approved'");
  const [[pending_members]] = await db.execute("SELECT COUNT(*) AS c FROM members WHERE status = 'pending'");
  const [[views]] = await db.execute("SELECT SUM(view_count) AS total FROM blogs");

  return {
    contributors: contributors.c,
    pending_contributors: pending_contributors.c,
    pending_reviews: pending_reviews.c,
    pending_comments: pending_comments.c,
    blogs: total_blogs.c,
    total_views: views.total || 0,
    approved_members: approved_members.c,
    pending_members: pending_members.c,
  };
}

async function getContributorStats(db, userId) {
  const [[total]] = await db.execute('SELECT COUNT(*) AS c FROM blogs WHERE author_id = ?', [userId]);
  const [[drafts]] = await db.execute("SELECT COUNT(*) AS c FROM blogs WHERE author_id = ? AND submission_status = 'draft'", [userId]);
  const [[submitted]] = await db.execute("SELECT COUNT(*) AS c FROM blogs WHERE author_id = ? AND submission_status IN ('submitted','edited')", [userId]);
  const [[approved]] = await db.execute("SELECT COUNT(*) AS c FROM blogs WHERE author_id = ? AND status IN ('approved','published')", [userId]);
  const [[rejected]] = await db.execute("SELECT COUNT(*) AS c FROM blogs WHERE author_id = ? AND status = 'rejected'", [userId]);
  const [[views]] = await db.execute('SELECT COALESCE(SUM(view_count), 0) AS total FROM blogs WHERE author_id = ?', [userId]);
  const [[comments]] = await db.execute('SELECT COUNT(*) AS c FROM comments cm JOIN blogs b ON cm.post_id = b.slug WHERE b.author_id = ?', [userId]);

  // Site-wide stats for privileged roles
  const [[pending_reviews]] = await db.execute("SELECT COUNT(*) AS c FROM blogs WHERE submission_status IN ('submitted','edited')");
  const [[pending_comments]] = await db.execute("SELECT COUNT(*) AS c FROM comments WHERE status = 'pending'");
  const [[rejected_comments]] = await db.execute("SELECT COUNT(*) AS c FROM comments WHERE status = 'rejected'");
  const [[total_ads]] = await db.execute('SELECT COUNT(*) AS c FROM ads');
  const [[total_announcements]] = await db.execute('SELECT COUNT(*) AS c FROM announcements');

  return {
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
  };
}

module.exports = { getAdminStats, getContributorStats };
