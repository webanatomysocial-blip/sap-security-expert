// Public-safe columns (no internal draft/admin fields exposed to guests)
const PUBLIC_COLS = 'id, title, slug, date, link, content, excerpt, image, image_alt, status, views, comments, created_at, updated_at';

async function findAll(db, { isAdmin }) {
  if (isAdmin) {
    const [rows] = await db.execute('SELECT * FROM announcements ORDER BY created_at DESC');
    return rows;
  }
  const [rows] = await db.execute(
    `SELECT ${PUBLIC_COLS} FROM announcements WHERE status IN ('approved','active','published') ORDER BY created_at DESC`
  );
  return rows;
}

async function findBySlug(db, slug, { isAdmin }) {
  const cols = isAdmin ? '*' : PUBLIC_COLS;
  const statusFilter = isAdmin ? '' : " AND status IN ('approved','active','published')";
  const [rows] = await db.execute(
    `SELECT ${cols} FROM announcements WHERE (slug=? OR id=?)${statusFilter} LIMIT 1`,
    [slug, slug]
  );
  return rows[0] || null;
}

async function findStatusById(db, id) {
  const [rows] = await db.execute('SELECT status, submission_status FROM announcements WHERE id=?', [id]);
  return rows[0] || null;
}

async function saveDraft(db, id, { title, date, link }) {
  await db.execute(
    "UPDATE announcements SET draft_title=?, draft_date=?, draft_link=?, submission_status='edited', updated_at=CURRENT_TIMESTAMP WHERE id=?",
    [title, date, link, id]
  );
}

async function update(db, id, fields) {
  const { title, slug, date, link, status, content, excerpt, image, image_alt } = fields;
  await db.execute(
    `UPDATE announcements SET title=?, slug=?, date=?, link=?, status=?, content=?, excerpt=?, image=?, image_alt=?,
     submission_status='approved', updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [title, slug, date, link, status, content, excerpt, image, image_alt, id]
  );
}

async function create(db, fields) {
  const { title, slug, date, link, status, content, excerpt, image, image_alt, submissionStatus } = fields;
  await db.execute(
    `INSERT INTO announcements (title, slug, date, link, status, content, excerpt, image, image_alt, views, comments, submission_status)
     VALUES (?,?,?,?,?,?,?,?,?,0,0,?)`,
    [title, slug, date, link, status, content, excerpt, image, image_alt, submissionStatus]
  );
}

async function remove(db, id) {
  await db.execute('DELETE FROM announcements WHERE id=?', [id]);
}

async function findFullById(db, id) {
  const [rows] = await db.execute('SELECT * FROM announcements WHERE id=?', [id]);
  return rows[0] || null;
}

async function approveEdited(db, id) {
  await db.execute(
    `UPDATE announcements SET
     title=COALESCE(draft_title,title), date=COALESCE(draft_date,date), link=COALESCE(draft_link,link),
     draft_title=NULL, draft_date=NULL, draft_link=NULL,
     submission_status='approved', status='approved', updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [id]
  );
}

async function approveDirect(db, id) {
  await db.execute(
    "UPDATE announcements SET submission_status='approved', status='approved', updated_at=CURRENT_TIMESTAMP WHERE id=?",
    [id]
  );
}

async function rejectEdited(db, id) {
  await db.execute(
    "UPDATE announcements SET draft_title=NULL, draft_date=NULL, draft_link=NULL, submission_status='approved', updated_at=CURRENT_TIMESTAMP WHERE id=?",
    [id]
  );
}

module.exports = {
  findAll, findBySlug, findStatusById, saveDraft, update, create, remove,
  findFullById, approveEdited, approveDirect, rejectEdited,
};
