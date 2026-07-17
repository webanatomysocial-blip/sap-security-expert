const { asyncHandler } = require('../../utils/asyncHandler');
const { sendSuccess, sendError } = require('../../utils/apiResponse');
const repo = require('../../repositories/admin/changelogRepository');
const fs = require('fs');
const path = require('path');

const CHANGELOG_PATH = path.join(__dirname, '../../../CHANGELOG.md');

const TYPE_MAP = {
  added: 'feature',
  new: 'feature',
  fixed: 'fix',
  fix: 'fix',
  bugfix: 'fix',
  changed: 'improvement',
  improved: 'improvement',
  updated: 'improvement',
  removed: 'breaking',
  breaking: 'breaking',
  security: 'fix',
  deprecated: 'breaking',
};

// Parse CHANGELOG.md (Keep a Changelog format) into flat log entries.
// Each ## [x.y.z] - date block becomes one entry per ### section item.
function parseChangelog() {
  if (!fs.existsSync(CHANGELOG_PATH)) return [];

  const text = fs.readFileSync(CHANGELOG_PATH, 'utf8');
  const entries = [];
  let id = 0;

  // Split on version headings: ## [3.2.0] - 2026-07-10
  const versionBlocks = text.split(/^## /m).filter(Boolean);

  for (const block of versionBlocks) {
    const versionMatch = block.match(/^\[([^\]]+)\]\s*-\s*(\d{4}-\d{2}-\d{2})/);
    if (!versionMatch) continue;

    const version = versionMatch[1];
    const dateStr = versionMatch[2];

    // Split into ### sections (Added, Fixed, Changed, etc.)
    const sections = block.split(/^### /m).slice(1);

    if (sections.length === 0) {
      // No sections — treat the whole block description as a single entry
      const desc = block.replace(/^\[[^\]]+\][^\n]*\n/, '').trim();
      if (desc) {
        entries.push({ id: `md-${++id}`, version, title: `v${version} Release`, description: desc, type: 'feature', author_name: null, created_at: new Date(dateStr).toISOString(), source: 'file' });
      }
      continue;
    }

    for (const section of sections) {
      const lines = section.split('\n');
      const sectionName = lines[0].trim().toLowerCase();
      const type = TYPE_MAP[sectionName] || 'improvement';
      const title = `${lines[0].trim()} — v${version}`;

      const items = lines
        .slice(1)
        .filter((l) => l.trim().startsWith('-'))
        .map((l) => l.trim().replace(/^-\s*/, ''));

      if (items.length === 0) continue;

      entries.push({
        id: `md-${++id}`,
        version,
        title,
        description: items.join('\n'),
        type,
        author_name: null,
        created_at: new Date(dateStr).toISOString(),
        source: 'file',
      });
    }
  }

  return entries;
}

// Map internal type → Keep a Changelog section heading
const SECTION_HEADING = {
  feature:     'Added',
  fix:         'Fixed',
  improvement: 'Changed',
  breaking:    'Removed',
};

// Prepend a new ## [version] block to CHANGELOG.md.
// If a block for that version already exists, merge the new section into it.
function writeToChangelog(version, title, description, type) {
  const heading = SECTION_HEADING[type] || 'Changed';
  const today = new Date().toISOString().slice(0, 10);
  const items = description.trim().split('\n').map((l) => `- ${l.replace(/^-\s*/, '')}`).join('\n');
  const newBlock = `## [${version}] - ${today}\n### ${heading}\n- ${title}\n${items}\n`;

  let existing = fs.existsSync(CHANGELOG_PATH) ? fs.readFileSync(CHANGELOG_PATH, 'utf8') : '# Changelog\n';

  // If this version block already exists, insert the new section into it
  const versionPattern = new RegExp(`(## \\[${version.replace(/\./g, '\\.')}\\][^\\n]*\\n)`, 'm');
  if (versionPattern.test(existing)) {
    existing = existing.replace(versionPattern, `$1### ${heading}\n- ${title}\n${items}\n\n`);
  } else {
    // Prepend after the first heading line (# Changelog)
    existing = existing.replace(/^(# [^\n]+\n)/, `$1\n${newBlock}\n`);
  }

  fs.writeFileSync(CHANGELOG_PATH, existing, 'utf8');
}

// GET /api/admin/changelog
// Merges CHANGELOG.md entries (auto) with manual DB entries, newest first.
const list = asyncHandler(async (req, res) => {
  const fileEntries = parseChangelog();
  const dbEntries = await repo.findAll(req.db).then((rows) =>
    rows.map((r) => ({ ...r, source: 'db' }))
  );

  // Merge: DB entries first (manual overrides), then file entries
  const all = [...dbEntries, ...fileEntries].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  return sendSuccess(res, { logs: all });
});

// POST /api/admin/changelog — manual entry
const create = asyncHandler(async (req, res) => {
  const { version, title, description, type } = req.body || {};
  if (!version?.trim() || !title?.trim() || !description?.trim()) {
    return sendError(res, 'Version, title, and description are required.', 400);
  }
  const validTypes = ['feature', 'fix', 'improvement', 'breaking'];
  const resolvedType = validTypes.includes(type) ? type : 'feature';
  await repo.create(req.db, {
    version: version.trim(),
    title: title.trim(),
    description: description.trim(),
    type: resolvedType,
    created_by: req.session.user_id || null,
  });
  writeToChangelog(version.trim(), title.trim(), description.trim(), resolvedType);
  return sendSuccess(res, {}, 'Changelog entry created.');
});

// PUT /api/admin/changelog/:id — only for DB entries
const update = asyncHandler(async (req, res) => {
  const { version, title, description, type } = req.body || {};
  if (!version?.trim() || !title?.trim() || !description?.trim()) {
    return sendError(res, 'Version, title, and description are required.', 400);
  }
  const validTypes = ['feature', 'fix', 'improvement', 'breaking'];
  const resolvedType = validTypes.includes(type) ? type : 'feature';
  await repo.update(req.db, req.params.id, {
    version: version.trim(),
    title: title.trim(),
    description: description.trim(),
    type: resolvedType,
  });
  writeToChangelog(version.trim(), title.trim(), description.trim(), resolvedType);
  return sendSuccess(res, {}, 'Changelog entry updated.');
});

// DELETE /api/admin/changelog/:id — only for DB entries
const remove = asyncHandler(async (req, res) => {
  await repo.remove(req.db, req.params.id);
  return sendSuccess(res, {}, 'Changelog entry deleted.');
});

module.exports = { list, create, update, remove };
