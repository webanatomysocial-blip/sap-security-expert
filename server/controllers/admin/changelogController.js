const { asyncHandler } = require('../../utils/asyncHandler');
const { sendSuccess, sendError } = require('../../utils/apiResponse');
const repo = require('../../repositories/admin/changelogRepository');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

// GET /api/admin/changelog
const list = asyncHandler(async (req, res) => {
  try {
    // Use NUL (\x00) as the record separator — safe because git output never
    // contains NUL bytes, unlike '|' which can appear in author names/subjects.
    // execFile (no shell) eliminates any future shell-injection risk.
    const { stdout } = await execFileAsync(
      'git',
      ['log', '--pretty=format:%h%x00%an%x00%ad%x00%s', '-n', '50', '--date=iso'],
      { encoding: 'utf8', cwd: process.cwd(), timeout: 5000 }
    );

    const logs = stdout.split('\n').filter(Boolean).map((line) => {
      const [hash, author, dateStr, ...subjectParts] = line.split('\x00');
      const subject = subjectParts.join('\x00'); // re-join in case subject itself had NUL (won't happen, but defensive)

      if (!hash || !dateStr) return null;

      let type = 'improvement';
      const cleanSubject = (subject || '').toLowerCase();
      if (cleanSubject.startsWith('fix:') || cleanSubject.includes('fix') || cleanSubject.includes('bug') || cleanSubject.includes('hotfix')) {
        type = 'fix';
      } else if (cleanSubject.startsWith('feat:') || cleanSubject.includes('feat') || cleanSubject.includes('add') || cleanSubject.includes('new')) {
        type = 'feature';
      } else if (cleanSubject.startsWith('break:') || cleanSubject.includes('break') || cleanSubject.includes('remove') || cleanSubject.includes('delete')) {
        type = 'breaking';
      }

      const parsedDate = new Date(dateStr);
      const isoDate = isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();

      const versionMatch = (subject || '').match(/v\d+\.\d+\.\d+/i);
      const version = versionMatch ? versionMatch[0].replace(/v/i, '') : `3.0.0-${hash}`;

      return {
        id: hash,
        version,
        title: subject || hash,
        description: `Commit by ${author || 'unknown'} (${hash}).`,
        type,
        author_name: author || 'unknown',
        created_at: isoDate,
      };
    }).filter(Boolean);

    return sendSuccess(res, { logs });
  } catch (err) {
    console.error('Failed to read git log, falling back to database:', err);
    const logs = await repo.findAll(req.db);
    return sendSuccess(res, { logs });
  }
});

// POST /api/admin/changelog (Disabled - no longer needed since it comes automatically)
const create = asyncHandler(async (req, res) => {
  return sendError(res, 'Manual changelog additions are disabled.', 405);
});

// PUT /api/admin/changelog/:id (Disabled - no longer needed since it comes automatically)
const update = asyncHandler(async (req, res) => {
  return sendError(res, 'Manual changelog updates are disabled.', 405);
});

// DELETE /api/admin/changelog/:id (Disabled - no longer needed since it comes automatically)
const remove = asyncHandler(async (req, res) => {
  return sendError(res, 'Manual changelog deletions are disabled.', 405);
});

module.exports = { list, create, update, remove };
