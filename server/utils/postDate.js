// Post dates: admins may set one (YYYY-MM-DD). Contributors never choose it:
// an update keeps the stored date and a new post gets today's date (UTC).
function resolvePostDate({ isAdmin, rawDate, existingDate, today }) {
  if (!isAdmin) return existingDate !== undefined ? existingDate : today;
  if (rawDate === undefined || rawDate === null || rawDate === '') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(rawDate)) || Number.isNaN(Date.parse(rawDate))) {
    const err = new Error('date must be a valid YYYY-MM-DD date');
    err.status = 400;
    throw err;
  }
  return String(rawDate);
}

function todayIso(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

module.exports = { resolvePostDate, todayIso };
