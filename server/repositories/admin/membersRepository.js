async function findByStatus(db, status) {
  let sql = `SELECT m.id, m.name, m.email, m.username, m.phone, m.location, m.country, m.company_name, m.job_role,
    m.status, m.profile_image, m.created_at, m.is_deleted, m.last_login, m.login_count,
    (SELECT COUNT(*) FROM blogs b JOIN users u ON u.id = b.author_id WHERE LOWER(u.email) = LOWER(m.email)) AS articles_published,
    (SELECT MAX(b.date) FROM blogs b JOIN users u ON u.id = b.author_id WHERE LOWER(u.email) = LOWER(m.email)) AS last_contribution,
    (SELECT COUNT(*) FROM blogs b JOIN users u ON u.id = b.author_id WHERE LOWER(u.email) = LOWER(m.email) AND b.category = 'expert-papers') AS expert_papers_count,
    (SELECT COALESCE(SUM(credits_delta), 0) FROM credit_transactions WHERE member_id = m.id AND credits_delta > 0) AS credits_earned,
    (SELECT COUNT(*) FROM members r WHERE r.referred_by_code = m.referral_code AND m.referral_code IS NOT NULL) AS referrals,
    (SELECT c.status FROM contributors c WHERE LOWER(c.email) = LOWER(m.email) AND (c.is_deleted = 0 OR c.is_deleted IS NULL) ORDER BY c.created_at DESC LIMIT 1) AS contributor_status,
    (SELECT a.status FROM ambassadors a WHERE LOWER(a.email) = LOWER(m.email) AND (a.is_deleted = 0 OR a.is_deleted IS NULL) ORDER BY a.created_at DESC LIMIT 1) AS ambassador_status
    FROM members m`;
  const params = [];
  if (status === 'deleted') {
    // 'deleted' tab shows deactivated/soft-deleted accounts
    sql += ' WHERE (m.status = ? OR m.status = ? OR m.is_deleted = 1)';
    params.push('deactivated', 'deleted');
  } else if (status !== 'all') {
    // for pending/approved/rejected/suspended — exact match, exclude soft-deleted
    sql += ' WHERE m.status = ? AND (m.is_deleted = 0 OR m.is_deleted IS NULL)';
    params.push(status);
  }
  // 'all' returns everything — client-side filter removes deactivated from default view
  sql += ' ORDER BY m.created_at DESC';
  const [rows] = await db.execute(sql, params);
  return rows;
}

async function findById(db, id) {
  const [rows] = await db.execute(
    'SELECT id, name, email, status, is_deleted, referred_by_code FROM members WHERE id=?', [id]
  );
  return rows[0] || null;
}

async function approve(db, id) {
  await db.execute("UPDATE members SET status='approved', approved_at=CURRENT_TIMESTAMP WHERE id=?", [id]);
}

async function findApprovedByReferralCode(db, code) {
  const [rows] = await db.execute(
    "SELECT id FROM members WHERE referral_code = ? AND status = 'approved' LIMIT 1",
    [code]
  );
  return rows[0] || null;
}

async function reject(db, id, reason) {
  await db.execute("UPDATE members SET status='rejected', rejection_reason=? WHERE id=?", [reason, id]);
}

async function suspend(db, id) {
  await db.execute("UPDATE members SET status='suspended' WHERE id=?", [id]);
}

// Note: the members-table update is not individually caught — its failure
// should propagate to the caller. The users/contributors sync updates below
// are best-effort and intentionally swallow their own errors, matching the
// original inline behavior exactly.
async function reactivate(db, id, email) {
  await db.execute("UPDATE members SET status='approved', is_deleted=0, deleted_at=NULL WHERE id=?", [id]);
  await db.execute("UPDATE users SET is_active=1, is_deleted=0, deleted_at=NULL WHERE LOWER(email)=LOWER(?)", [email]).catch(() => {});
  await db.execute("UPDATE contributors SET status='approved', is_deleted=0, deleted_at=NULL WHERE LOWER(email)=LOWER(?)", [email]).catch(() => {});
}

async function hardDelete(db, id) {
  await db.execute('DELETE FROM members WHERE id=?', [id]);
}

async function softDelete(db, id, email) {
  await db.execute("UPDATE members SET is_deleted=1, deleted_at=CURRENT_TIMESTAMP, status='deactivated' WHERE id=?", [id]);
  await db.execute("UPDATE users SET is_active=0, is_deleted=1, deleted_at=CURRENT_TIMESTAMP WHERE LOWER(email)=LOWER(?)", [email]).catch(() => {});
  await db.execute("UPDATE contributors SET is_deleted=1, deleted_at=CURRENT_TIMESTAMP, status='deactivated' WHERE LOWER(email)=LOWER(?)", [email]).catch(() => {});
}

async function updatePasswordHash(db, memberId, hash) {
  await db.execute('UPDATE members SET password_hash=? WHERE id=?', [hash, memberId]);
}

async function findEmailById(db, memberId) {
  const [rows] = await db.execute('SELECT email FROM members WHERE id=?', [memberId]);
  return rows[0]?.email || null;
}

async function syncPasswordToUser(db, email, hash) {
  await db.execute('UPDATE users SET password=? WHERE LOWER(email)=LOWER(?)', [hash, email]);
}

module.exports = {
  findByStatus, findById, approve, findApprovedByReferralCode, reject, suspend,
  reactivate, hardDelete, softDelete, updatePasswordHash, findEmailById, syncPasswordToUser,
};
