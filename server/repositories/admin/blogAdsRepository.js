const { isSQLite } = require('../../db');

// Auto-create table. blog_ads has no entry in server/migrations/ — this lazy
// CREATE TABLE IF NOT EXISTS is the only thing that ever creates it, in both
// dev (SQLite) and production (MySQL/MariaDB). The two engines don't share a
// single portable syntax for an auto-incrementing primary key (SQLite:
// INTEGER PRIMARY KEY AUTOINCREMENT, MySQL: INT AUTO_INCREMENT PRIMARY KEY),
// and MySQL/MariaDB additionally rejects non-NULL literal DEFAULT values on
// TEXT/BLOB columns — so the short enum-like/string columns below use
// VARCHAR, matching how every other table with a non-NULL string default is
// defined in server/migrations/schema.sql.
async function ensureTable(db) {
  if (isSQLite) {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS blog_ads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ad_type TEXT NOT NULL DEFAULT 'inline',
        target TEXT NOT NULL DEFAULT 'all',
        blog_slugs TEXT DEFAULT NULL,
        position INTEGER DEFAULT 3,
        image TEXT NOT NULL DEFAULT '',
        link TEXT DEFAULT '',
        title TEXT DEFAULT '',
        active INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } else {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS blog_ads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ad_type VARCHAR(50) NOT NULL DEFAULT 'inline',
        target VARCHAR(50) NOT NULL DEFAULT 'all',
        blog_slugs TEXT DEFAULT NULL,
        position INT DEFAULT 3,
        image VARCHAR(500) NOT NULL DEFAULT '',
        link VARCHAR(500) DEFAULT '',
        title VARCHAR(255) DEFAULT '',
        active TINYINT DEFAULT 0,
        clicks INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
}

function parseSlugs(row) {
  try { row.blog_slugs = row.blog_slugs ? JSON.parse(row.blog_slugs) : []; } catch { row.blog_slugs = []; }
  return row;
}

async function findAll(db) {
  await ensureTable(db);
  const [rows] = await db.execute('SELECT * FROM blog_ads ORDER BY created_at DESC');
  return rows.map(parseSlugs);
}

async function findActive(db) {
  await ensureTable(db);
  const [rows] = await db.execute('SELECT * FROM blog_ads WHERE active = 1');
  return rows.map(parseSlugs);
}

async function findImageById(db, id) {
  const [rows] = await db.execute('SELECT image FROM blog_ads WHERE id=? LIMIT 1', [id]);
  return rows[0]?.image || null;
}

async function create(db, fields) {
  await ensureTable(db);
  const { ad_type, target, blog_slugs, position, image, link, title, active } = fields;
  await db.execute(
    'INSERT INTO blog_ads (ad_type, target, blog_slugs, position, image, link, title, active) VALUES (?,?,?,?,?,?,?,?)',
    [ad_type, target, blog_slugs, position, image, link, title, active]
  );
}

async function update(db, id, fields) {
  await ensureTable(db);
  const { ad_type, target, blog_slugs, position, image, link, title, active } = fields;
  await db.execute(
    'UPDATE blog_ads SET ad_type=?, target=?, blog_slugs=?, position=?, image=?, link=?, title=?, active=? WHERE id=?',
    [ad_type, target, blog_slugs, position, image, link, title, active, id]
  );
}

async function toggleActive(db, id) {
  await ensureTable(db);
  await db.execute('UPDATE blog_ads SET active = CASE WHEN active=1 THEN 0 ELSE 1 END WHERE id=?', [id]);
}

async function incrementClicks(db, id) {
  await db.execute('UPDATE blog_ads SET clicks = COALESCE(clicks,0)+1 WHERE id=?', [id]);
}

async function remove(db, id) {
  await db.execute('DELETE FROM blog_ads WHERE id=?', [id]);
}

module.exports = {
  ensureTable, findAll, findActive, findImageById, create, update, toggleActive, incrementClicks, remove,
};
