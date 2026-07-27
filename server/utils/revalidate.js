const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const isDev = process.env.NODE_ENV !== 'production';
const NEXT_URL = (isDev
  ? (process.env.FRONTEND_URL || 'http://localhost:3000')
  : (process.env.SITE_URL || 'http://127.0.0.1:3000')).replace(/\/$/, '');
const SECRET = process.env.REVALIDATE_SECRET;

/**
 * Tell Next.js to bust the SSR cache for a blog page.
 * Fire-and-forget — never throws, never blocks the response.
 */
async function revalidateBlog(category, slug) {
  if (!SECRET || !category || !slug) return;
  try {
    await fetch(`${NEXT_URL}/api/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: SECRET, category, slug }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Non-fatal — page will revalidate on its own after TTL
  }
}

module.exports = { revalidateBlog };
