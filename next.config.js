/** @type {import('next').NextConfig} */
const nextConfig = {
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
  async rewrites() {
    // Unified mode: no rewrites needed.
    if (process.env.UNIFIED_SERVER === 'true') return [];

    // Split mode: proxy to external Express server.
    const apiBase = process.env.EXPRESS_API_URL;
    if (!apiBase) return []; // dev fallback — Next.js dev proxy not needed either

    return [
      { source: '/api/:path*',     destination: `${apiBase}/api/:path*`     },
      { source: '/uploads/:path*', destination: `${apiBase}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
