const fs = require('fs');
const path = require('path');
const axios = require('axios');

const ROOT = path.join(__dirname, '../..');

/**
 * Delete an image from the filesystem.
 * Mirrors api/utils.php deleteImage().
 */
function deleteImage(imagePath) {
  if (!imagePath) return false;
  if (!imagePath.startsWith('/')) imagePath = '/' + imagePath;

  const candidates = [
    path.join(ROOT, imagePath),
    path.join(ROOT, 'public', imagePath),
    path.join(ROOT, 'public/assets', imagePath.replace('/assets', '')),
    path.join(ROOT, 'public/uploads', imagePath.replace('/uploads', '')),
    path.join(ROOT, 'assets', imagePath.replace('/assets', '')),
  ];

  const allowedRoot = path.join(ROOT, 'public', 'uploads');
  for (const p of candidates) {
    const normalized = path.normalize(p);
    // Reject any path that escapes the uploads directory
    if (!normalized.startsWith(allowedRoot + path.sep) && normalized !== allowedRoot) continue;
    if (fs.existsSync(normalized) && fs.statSync(normalized).isFile()) {
      try { fs.unlinkSync(normalized); return true; } catch { /* skip */ }
    }
  }
  return false;
}

/**
 * Calculate an SEO score (0–100) from blog fields.
 * Mirrors api/utils.php calculateSeoScore().
 */
function calculateSeoScore(blog) {
  let score = 100;

  const metaTitle = (blog.meta_title || '').trim();
  const metaTitleLen = metaTitle.length;
  const metaDesc = (blog.meta_description || '').trim();
  const metaDescLen = metaDesc.length;

  const textOnly = (blog.content || '').replace(/<[^>]+>/g, '');
  const wordCount = textOnly.trim().split(/\s+/).filter(Boolean).length;

  if (metaTitleLen < 50 || metaTitleLen > 70) score -= 15;
  if (metaDescLen < 140 || metaDescLen > 165) score -= 15;
  if (wordCount < 600) score -= 20;
  if (!blog.image) score -= 10;
  if (metaDescLen >= 120) score += 5;

  const keywords = (blog.meta_keywords || '').trim();
  if (keywords && keywords.split(',').length >= 3) score += 5;

  return Math.max(0, Math.min(100, score));
}

/**
 * Check plagiarism via external API.
 * Mirrors api/utils.php checkPlagiarismScore().
 */
async function checkPlagiarismScore(text, blogId = null, db = null) {
  if (!text || !text.trim()) return { score: 0, error: null };

  const token = process.env.PLAGIARISM_API_TOKEN;
  if (!token) return { score: -1, error: 'API Token missing' };

  const cleanText = text.replace(/<[^>]+>/g, '');

  try {
    const submitRes = await axios.post(
      'https://plagiarismcheck.org/api/v1/text',
      new URLSearchParams({ language: 'en', text: cleanText }),
      { headers: { 'X-API-TOKEN': token }, timeout: 15000 }
    );

    const id = submitRes.data?.data?.text?.id;
    if (!id) return { score: -1, error: 'No task ID returned' };

    // Poll up to 10 times
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1500));
      const pollRes = await axios.get(`https://plagiarismcheck.org/api/v1/text/${id}`, {
        headers: { 'X-API-TOKEN': token }, timeout: 5000,
      });
      if (pollRes.data?.data?.text?.state === 5) {
        const reportRes = await axios.get(`https://plagiarismcheck.org/api/v1/text/${id}/report`, {
          headers: { 'X-API-TOKEN': token }, timeout: 5000,
        });
        const percent = reportRes.data?.data?.report?.percent;
        if (percent != null) {
          const score = Math.max(0, 100 - parseInt(percent));
          if (db && blogId) {
            await db.execute(
              'INSERT INTO plagiarism_logs (blog_id, score, raw_response) VALUES (?, ?, ?)',
              [blogId, score, JSON.stringify(reportRes.data)]
            ).catch(() => {});
          }
          return { score, error: null };
        }
        break;
      }
    }

    return { score: -1, error: 'Check timed out' };
  } catch (err) {
    const httpCode = err.response?.status;
    const errorMsg = httpCode === 409 ? 'API Credits Exhausted (409)' : `API Error (${httpCode || err.message})`;
    if (db && blogId) {
      await db.execute(
        'INSERT INTO plagiarism_logs (blog_id, score, raw_response) VALUES (?, ?, ?)',
        [blogId, -1, errorMsg]
      ).catch(() => {});
    }
    return { score: -1, error: errorMsg };
  }
}

/**
 * Resolve upload directory.
 *
 * Priority order:
 *   1. UPLOAD_BASE_DIR env var — explicit override (e.g. a Railway/cloud volume path)
 *   2. <project_root>/public/uploads/<sub> — default for ALL environments
 *
 * Why always public/uploads?  Express static-serving is configured to serve
 * /uploads/* from <root>/public/uploads/.  Saving to any other directory means
 * uploaded images return 404.  This was a production bug when DB_CONNECTION=mysql
 * caused the old code to use <root>/uploads/ instead.
 */
function getUploadDir(sub) {
  const base = process.env.UPLOAD_BASE_DIR
    ? path.join(process.env.UPLOAD_BASE_DIR, sub)
    : path.join(ROOT, 'public/uploads', sub);
  if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
  return base;
}

module.exports = { deleteImage, calculateSeoScore, checkPlagiarismScore, getUploadDir };
