/** @type {import('next').NextConfig} */
const nextConfig = {
  // Reduce the number of SSR pages Next.js keeps hot in memory.
  // Default is 50; 25 is plenty for this app and halves the page-cache footprint.
  onDemandEntries: {
    maxInactiveAge: 15 * 1000,
    pagesBufferLength: 2,
  },

  images: {
    // Unoptimized so all <Image> components work as plain <img> tags without
    // the optimization pipeline. The SSR blog route uses explicit dimensions
    // which already give the best LCP without optimization.
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // ── API + upload rewrites ─────────────────────────────────────────────────
  //
  // TWO deployment modes are supported:
  //
  // A) UNIFIED SERVER (Hostinger) — start.cjs sets UNIFIED_SERVER=true.
  //    Express is embedded in the same process. The raw http.createServer in
  //    start.cjs intercepts /api/* and /uploads/* BEFORE Next.js sees them,
  //    so Next.js rewrites are never reached and must NOT be configured
  //    (pointing them at localhost:3001 would cause 502s since nothing listens
  //    on that port).
  //
  // B) SPLIT SERVER (Vercel frontend + external Express backend) — set
  //    EXPRESS_API_URL to the Railway/Render service URL in Vercel env vars.
  //    Next.js rewrites proxy /api/* and /uploads/* to that URL.
  //
  // ── 301 redirects for known dead/renamed URLs ───────────────────────────────
  // Server-side (not a client-side React Router <Navigate>), so search engines
  // and old bookmarks/links get a real 301 instead of a 200 that then redirects.
  async redirects() {
    return [
      // /contributors was removed; the directory lives at /leaderboard now.
      { source: '/contributors', destination: '/leaderboard', permanent: true },
      // Learning Hub module pages live under /learning/:slug. Links/bookmarks
      // to the bare slug (e.g. from a breadcrumb bug — see BlogLayout.jsx)
      // 404'd instead of reaching the module page.
      { source: '/security-fundamentals', destination: '/learning/security-fundamentals', permanent: true },
      { source: '/user-management', destination: '/learning/user-management', permanent: true },
      { source: '/role-management', destination: '/learning/role-management', permanent: true },
      { source: '/authorization-concepts', destination: '/learning/authorization-concepts', permanent: true },
      { source: '/audit-compliance', destination: '/learning/audit-compliance', permanent: true },
      { source: '/grc-advanced', destination: '/learning/grc-advanced', permanent: true },
    ];
  },

  async rewrites() {
    // Unified mode: no rewrites needed.
    if (process.env.UNIFIED_SERVER === 'true') return [];

    // Split mode: proxy to external Express server.
    const apiBase = process.env.EXPRESS_API_URL;
    if (apiBase) {
      return [
        { source: '/api/:path*',     destination: `${apiBase}/api/:path*`     },
        { source: '/uploads/:path*', destination: `${apiBase}/uploads/:path*` },
      ];
    }

    // Local dev mode: proxy /api/* and /uploads/* from Next.js (port 3000)
    // to the Express dev server (port 3001). Without this, API calls would
    // hit Next.js and return HTML instead of JSON.
    // This branch is only reached when UNIFIED_SERVER and EXPRESS_API_URL are
    // both unset — never in production.
    const localApiPort = process.env.EXPRESS_PORT || '3001';
    return [
      { source: '/api/:path*',     destination: `http://localhost:${localApiPort}/api/:path*`     },
      { source: '/uploads/:path*', destination: `http://localhost:${localApiPort}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
