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

module.exports = { grantBonus };
