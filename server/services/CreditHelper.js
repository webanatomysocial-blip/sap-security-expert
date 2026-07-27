const repo = require('../repositories/admin/creditsRepository');

/**
 * Look up the credit amount for an activity key from the DB.
 * Falls back to `fallback` if the activity is missing or disabled.
 */
async function getActivityCredits(db, key, fallback) {
  try {
    const activity = await repo.findActivityByKey(db, key);
    if (activity && activity.is_active) return activity.credits;
  } catch {}
  return fallback;
}

/**
 * Central helper for granting bonus credits.
 * Uses note as a natural dedup key — same note = same event.
 * Pass a unique note per event instance (e.g. include blog_id for article bonus).
 */
async function grantBonus(db, memberId, amount, note) {
  if (!memberId || !amount || !note) return false;

  // Dedup — never double-grant the same noted event
  const [dup] = await db.execute(
    'SELECT id FROM credit_transactions WHERE member_id=? AND note=? LIMIT 1',
    [memberId, note]
  );
  if (dup.length) return false;

  const [rows] = await db.execute('SELECT id FROM member_credits WHERE member_id=? LIMIT 1', [memberId]);
  if (rows.length) {
    await db.execute('UPDATE member_credits SET balance=balance+?, updated_at=CURRENT_TIMESTAMP WHERE member_id=?', [amount, memberId]);
  } else {
    await db.execute('INSERT INTO member_credits (member_id, balance) VALUES (?,?)', [memberId, amount]);
  }
  await db.execute(
    "INSERT INTO credit_transactions (member_id, type, credits_delta, amount_paise, note) VALUES (?, 'bonus', ?, 0, ?)",
    [memberId, amount, note]
  );
  return true;
}

/**
 * Grants credits to the author of a blog when it gets published/approved.
 * Replay-safe using a unique note containing the blog's title.
 */
async function grantArticlePublishedCredits(db, blogId) {
  if (!blogId) return;
  try {
    const [blogs] = await db.execute(
      `SELECT b.id, b.title, u.email AS author_email
       FROM blogs b
       LEFT JOIN users u ON b.author_id = u.id
       WHERE b.id = ? LIMIT 1`,
      [blogId]
    );
    const blog = blogs[0];
    if (!blog || !blog.author_email) return;

    const [members] = await db.execute(
      'SELECT id FROM members WHERE LOWER(email) = LOWER(?) LIMIT 1',
      [blog.author_email]
    );
    const member = members[0];
    if (!member) return;

    const amt = await getActivityCredits(db, 'article_published', 20);
    const note = `Article published: "${blog.title}"`;
    await grantBonus(db, member.id, amt, note);
  } catch (err) {
    console.error('[CreditHelper] Failed to grant article credits:', err.message);
  }
}

module.exports = { grantBonus, getActivityCredits, grantArticlePublishedCredits };
