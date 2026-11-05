// Only what the first paint needs is kept in localStorage. Contact details and
// profile text are fetched fresh from the server on every load and kept in memory.
export function cacheableMember(m) {
  if (!m) return m;
  const { id, name, username, profile_image, status, is_real_contributor, is_ambassador } = m;
  return { id, name, username, profile_image, status, is_real_contributor, is_ambassador };
}
