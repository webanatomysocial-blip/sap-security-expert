// Public visibility policy for approved contributors.
//
// Settings are stored as JSON on the linked members row (profile_visibility).
// Only an explicit boolean `true` enables a flag. A missing, invalid or
// unrecognised value keeps the field hidden (fail closed). show_name=false
// removes the whole profile from public output.

const FLAGS = ['show_name', 'show_picture', 'show_company', 'show_in_directory', 'show_stats', 'show_badges'];

function parseContributorVisibility(raw) {
  let parsed = raw;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { parsed = null; }
  }
  const flags = {};
  for (const key of FLAGS) flags[key] = !!parsed && typeof parsed === 'object' && parsed[key] === true;
  return flags;
}

// Returns { contributor, flags } with internal fields removed, or null when the
// profile must not be published at all.
function applyContributorPublicPolicy(row) {
  if (!row) return null;
  const flags = parseContributorVisibility(row.profile_visibility);
  if (!flags.show_name) return null;

  // Always internal, whatever the settings say.
  const { profile_visibility, member_country, email, user_id, username, ...rest } = row;
  const out = { ...rest };

  // Country keeps its existing rule: shown unless show_country is explicitly false.
  let vis = row.profile_visibility;
  if (typeof vis === 'string') { try { vis = JSON.parse(vis); } catch { vis = null; } }
  if (vis && typeof vis === 'object' && vis.show_country === false) out.country = null;

  if (!flags.show_picture) out.profile_image = null;
  if (!flags.show_company) out.organization = null;
  if (!flags.show_stats) {
    delete out.contributions_count;
    delete out.blog_count;
  }
  return { contributor: out, flags };
}

// Blog cards carry view counts; drop them when statistics are hidden.
function stripBlogStats(blogs, flags) {
  if (flags.show_stats) return blogs;
  return blogs.map(({ view_count, ...b }) => b);
}

// For any public directory-style list (homepage, leaderboard, directory):
// returns the public-safe contributor, or null when the profile must not be listed.
function publicDirectoryEntry(row) {
  const policy = applyContributorPublicPolicy(row);
  if (!policy || !policy.flags.show_in_directory) return null;
  return policy.contributor;
}

module.exports = { parseContributorVisibility, applyContributorPublicPolicy, publicDirectoryEntry, stripBlogStats, FLAGS };
