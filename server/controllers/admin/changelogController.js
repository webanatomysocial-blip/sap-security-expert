const { asyncHandler } = require('../../utils/asyncHandler');
const { sendSuccess, sendError } = require('../../utils/apiResponse');
const repo = require('../../repositories/admin/changelogRepository');
const { execSync } = require('child_process');

// GET /api/admin/changelog
const list = asyncHandler(async (req, res) => {
  try {
    // Automatically retrieve the last 50 git commits
    const gitLogOutput = execSync('git log --pretty=format:"%h|%an|%ad|%s" -n 50 --date=iso', {
      encoding: 'utf8',
      cwd: process.cwd()
    });

    const logs = gitLogOutput.split('\n').filter(Boolean).map((line) => {
      const [hash, author, dateStr, subject] = line.split('|');

      // Determine type based on commit subject prefix/keywords
      let type = 'improvement';
      const cleanSubject = subject.toLowerCase();
      if (cleanSubject.startsWith('fix:') || cleanSubject.includes('fix') || cleanSubject.includes('bug') || cleanSubject.includes('hotfix')) {
        type = 'fix';
      } else if (cleanSubject.startsWith('feat:') || cleanSubject.includes('feat') || cleanSubject.includes('add') || cleanSubject.includes('new')) {
        type = 'feature';
      } else if (cleanSubject.startsWith('break:') || cleanSubject.includes('break') || cleanSubject.includes('remove') || cleanSubject.includes('delete')) {
        type = 'breaking';
      }

      // Determine version: parse version if specified in commit message (e.g. v3.0.0), otherwise fallback to 3.0.0-[hash]
      let version = '3.0.0';
      const versionMatch = subject.match(/v\d+\.\d+\.\d+/i);
      if (versionMatch) {
        version = versionMatch[0].replace(/v/i, '');
      } else {
        version = `3.0.0-${hash}`;
      }

      return {
        id: hash,
        version: version,
        title: subject,
        description: `Commit by ${author} (${hash}).`,
        type: type,
        author_name: author,
        created_at: new Date(dateStr).toISOString()
      };
    });

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
