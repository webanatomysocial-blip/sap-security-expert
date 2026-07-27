async function getSetting(db, key) {
  try {
    const [rows] = await db.execute('SELECT value FROM site_settings WHERE `key`=? LIMIT 1', [key]);
    return rows[0]?.value ?? null;
  } catch (_) {
    // site_settings table may not exist yet (migration pending) — return null so callers use their default
    return null;
  }
}

async function setSetting(db, key, value) {
  // translateSQL in db.js converts ON DUPLICATE KEY UPDATE → INSERT OR REPLACE for SQLite
  await db.execute(
    `INSERT INTO site_settings (\`key\`, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE value=VALUES(value), updated_at=CURRENT_TIMESTAMP`,
    [key, String(value)]
  );
}

async function getAllSettings(db) {
  const [rows] = await db.execute('SELECT `key`, value FROM site_settings');
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

module.exports = { getSetting, setSetting, getAllSettings };
