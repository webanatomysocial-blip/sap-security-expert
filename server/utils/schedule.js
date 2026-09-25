const sqlUtc = (d) => d.toISOString().slice(0, 19).replace('T', ' ');

// Valid future ISO string -> 'YYYY-MM-DD HH:MM:SS' (UTC), otherwise null.
function parseSchedule(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) || d.getTime() <= Date.now() ? null : sqlUtc(d);
}

// After a save: pin publish_date (and date) to the schedule, or clear a stale
// one left over from a previously scheduled item. `table` is always a literal.
async function applySchedule(db, table, id, sched, targetStatus, wasScheduled) {
  if (sched) {
    await db.execute(`UPDATE ${table} SET publish_date=?, date=? WHERE id=?`, [sched, sched, id]);
  } else if (wasScheduled) {
    const live = ['approved', 'published', 'active'].includes(targetStatus);
    await db.execute(`UPDATE ${table} SET publish_date=? WHERE id=?`, [live ? sqlUtc(new Date()) : null, id]);
  }
}

module.exports = { parseSchedule, applySchedule, sqlUtc };
