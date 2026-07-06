// `type` is VARCHAR(50), not TEXT — MySQL/MariaDB rejects a non-NULL literal
// DEFAULT on TEXT/BLOB columns outright (confirmed against a real MySQL
// server: ERROR 1101, "BLOB, TEXT, GEOMETRY or JSON column 'type' can't have
// a default value"). This single statement works on both SQLite and
// MySQL/MariaDB unchanged.
async function ensureTable(db) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS changelogs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      version VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      type VARCHAR(50) NOT NULL DEFAULT 'feature',
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function findAll(db) {
  await ensureTable(db);
  const [rows] = await db.execute(
    `SELECT c.*, COALESCE(u.full_name, u.username) AS author_name
     FROM changelogs c LEFT JOIN users u ON u.id = c.created_by
     ORDER BY c.created_at DESC`
  );
  return rows;
}

async function create(db, fields) {
  await ensureTable(db);
  const { version, title, description, type, created_by } = fields;
  await db.execute(
    'INSERT INTO changelogs (version, title, description, type, created_by) VALUES (?, ?, ?, ?, ?)',
    [version, title, description, type, created_by]
  );
}

async function update(db, id, fields) {
  const { version, title, description, type } = fields;
  await db.execute(
    'UPDATE changelogs SET version=?, title=?, description=?, type=? WHERE id=?',
    [version, title, description, type, id]
  );
}

async function remove(db, id) {
  await db.execute('DELETE FROM changelogs WHERE id=?', [id]);
}

module.exports = { ensureTable, findAll, create, update, remove };
