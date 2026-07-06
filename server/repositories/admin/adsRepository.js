async function findByZone(db, zone) {
  const [rows] = await db.execute('SELECT * FROM ads WHERE zone=?', [zone]);
  return rows[0] || null;
}

async function findAll(db) {
  const [rows] = await db.execute('SELECT * FROM ads');
  return rows;
}

async function create(db, { zone, image, link, isActive }) {
  await db.execute(
    'INSERT INTO ads (zone, image, link, active, status, clicks) VALUES (?,?,?,?,?,0)',
    [zone, image, link, isActive, isActive ? 'active' : 'inactive']
  );
}

async function update(db, zone, { image, link, isActive }, resetClicks) {
  if (resetClicks) {
    await db.execute(
      'UPDATE ads SET image=?, link=?, active=?, status=?, clicks=0 WHERE zone=?',
      [image, link, isActive, isActive ? 'active' : 'inactive', zone]
    );
  } else {
    await db.execute(
      'UPDATE ads SET image=?, link=?, active=?, status=? WHERE zone=?',
      [image, link, isActive, isActive ? 'active' : 'inactive', zone]
    );
  }
}

async function incrementClicks(db, zone) {
  await db.execute('UPDATE ads SET clicks = COALESCE(clicks,0) + 1 WHERE zone=?', [zone]);
}

module.exports = { findByZone, findAll, create, update, incrementClicks };
