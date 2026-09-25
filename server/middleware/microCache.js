// Short-lived in-memory cache for public, logged-out GET requests.
// - Only requests without a session cookie are served from / stored in it, so
//   admin and member views (which can differ per user) are never cached.
// - Only 200 responses are stored, so a 404 for a not-yet-published item never sticks.
// - Any successful write (POST/PUT/PATCH/DELETE) under /api clears everything, so
//   edits show up immediately; the TTL only bounds how long a missed change lasts.
const store = new Map();
const MAX_ENTRIES = 300;
const TTL_MS = 60 * 1000;

// Deliberately excludes captcha, geoip, downloads, ads (rotation) and anything per-user.
const CACHEABLE = /^\/(posts|version|popular-tags|stats\/community|contributors\/leaderboard|community\/countries|categories|trending|learnings|news|announcements|announcements-public|get-comments|content|posts-sitemap)(\/|\?|$)/;

function clear() {
  store.clear();
}

function microCache(req, res, next) {
  if (req.method !== 'GET') {
    res.on('finish', () => { if (res.statusCode < 400) clear(); });
    return next();
  }
  if (!CACHEABLE.test(req.url) || (req.headers.cookie || '').includes('connect.sid') || req.headers['x-ssr-internal']) {
    return next();
  }

  // originalUrl: routers mounted deeper (e.g. /api/posts) rewrite req.url before the response is sent.
  const key = req.originalUrl;
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    res.set('X-Cache', 'HIT');
    return res.type('json').send(hit.body);
  }

  res.json = (obj) => {
    const body = JSON.stringify(obj);
    if (res.statusCode === 200) {
      if (store.size >= MAX_ENTRIES) store.delete(store.keys().next().value);
      store.set(key, { at: Date.now(), body });
    }
    return res.type('json').send(body);
  };
  next();
}

module.exports = { microCache, clear };
