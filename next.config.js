/** @type {import('next').NextConfig} */
const nextConfig = {
  // SSR mode — Next.js runs as a Node.js server (next start in production).
  // output:'export' is removed so generateMetadata and server components work.
  images: {
    // Global unoptimized keeps all SPA <Image> components working as plain <img>
    // tags with correct width/height (prevents CLS) without needing the optimization
    // pipeline. The SSR blog post page uses priority + explicit dimensions which
    // already give the best LCP without optimization.
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Vercel deployment: proxy /api/* and /uploads/* to Railway Express server.
  // EXPRESS_API_URL is set in Vercel env vars to the Railway service URL.
  // Falls back to localhost:3001 for local dev (when EXPRESS_API_URL is not set).
  async rewrites() {
    const apiBase = process.env.EXPRESS_API_URL || 'http://localhost:3001';
    return [
      {
        source: '/api/:path*',
        destination: `${apiBase}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${apiBase}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
