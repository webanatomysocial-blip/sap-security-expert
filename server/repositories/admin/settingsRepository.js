async function getSetting(db, key) {
  const [rows] = await db.execute('SELECT value FROM site_settings WHERE key=? LIMIT 1', [key]);
  return rows[0]?.value ?? null;
}

async function setSetting(db, key, value) {
  // MySQL: INSERT ... ON DUPLICATE KEY UPDATE; SQLite: INSERT OR REPLACE
  try {
    await db.execute(
      `INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE value=VALUES(value), updated_at=CURRENT_TIMESTAMP`,
      [key, String(value)]
    );
  } catch {
    // SQLite fallback
    await db.execute(
      `INSERT OR REPLACE INTO site_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`,
      [key, String(value)]
    );
  }
}

async function getAllSettings(db) {
  const [rows] = await db.execute('SELECT key, value FROM site_settings');
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

module.exports = { getSetting, setSetting, getAllSettings };
