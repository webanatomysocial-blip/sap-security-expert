// Contributors get their own `members` row (created on approval), which is
// where country privacy (show_country) lives — so contributor listings honor
// the same member privacy toggle rather than always showing country.
// Shared by publicRepository.js and contributorsPublicRepository.js so the
// privacy rule can't drift between the two endpoints.
function applyContributorCountryVisibility(row) {
  let showCountry = true;
  try {
    const vis = row.profile_visibility ? JSON.parse(row.profile_visibility) : {};
    if (vis.show_country === false) showCountry = false;
  } catch { /* keep default */ }
  // eslint-disable-next-line no-unused-vars -- destructured only to omit them from `rest`
  const { profile_visibility, member_country, ...rest } = row;
  return { ...rest, country: showCountry ? row.country : null };
}

module.exports = { applyContributorCountryVisibility };
