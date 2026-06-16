'use strict';
/**
 * Unified entry point for Hostinger Node.js Application Hosting.
 *
 * Runs Next.js SSR + Express API in a single Node.js process on the port
 * Hostinger assigns via process.env.PORT.
 *
 * Hostinger hPanel settings:
 *   Application Root : /home/<user>/htdocs/sap.webanatomy.in
 *   Startup File     : start.cjs
 *   Node.js version  : 20.x or 22.x
 *   Install Command  : npm install
 *   Build Command    : npm run build
 */

const path = require('path');
const http = require('http');
const { parse } = require('url');

// 1. Load environment variables from server/.env
//    dotenv is now in root node_modules (added to package.json dependencies).
//    Fallback to server/node_modules/dotenv for backwards compatibility.
try {
  require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });
} catch {
  try {
    require('./server/node_modules/dotenv').config({ path: path.join(__dirname, 'server', '.env') });
  } catch {
    console.warn('[start.cjs] dotenv not found — environment variables must be set externally');
  }
}

// 2. Determine the listening port.
//    Hostinger assigns process.env.PORT. It can be a TCP port number or a
//    Unix socket path (named pipe). Both are handled below.
const PORT_ENV = process.env.PORT || '3000';
const isPipe   = isNaN(parseInt(PORT_ENV, 10));
const PORT     = isPipe ? PORT_ENV : parseInt(PORT_ENV, 10);

// 3. Set INTERNAL_API_URL so Next.js Server Components can reach Express
//    (e.g. SSR blog page, sitemap) during server-side rendering without
//    going out to the network. In unified-server mode both live in the
//    same process, so we loop back on 127.0.0.1:PORT.
//    If Hostinger uses a Unix socket we fall back to the public site URL.
process.env.INTERNAL_API_URL = isPipe
  ? (process.env.SITE_URL || 'https://sap.webanatomy.in').replace(/\/$/, '')
  : `http://127.0.0.1:${PORT}`;

// 4. Ensure NODE_ENV is production (Hostinger may not set this).
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// 5. Signal to next.config.js that rewrites are NOT needed (Express is
//    embedded — the raw http server routes /api/* before Next.js sees it).
process.env.UNIFIED_SERVER = 'true';

async function main() {
  // 6. Prepare the Next.js SSR engine.
  //    next is an ES module, so use dynamic import().
  const { default: next } = await import('next');
  const nextApp    = next({ dev: false });
  await nextApp.prepare();
  const nextHandle = nextApp.getRequestHandler();

  // 7. Load the Express app WITHOUT starting its own HTTP server.
  //    server/index.js calls app.listen() only when run as __main__.
  const expressApp = require('./server/index.js');

  // 8. Single HTTP server:
  //      /api/*     → Express (all JSON API endpoints)
  //      /uploads/* → Express (serves files from public/uploads via express.static)
  //      everything else → Next.js (SSR pages, static assets, /_next/*)
  const server = http.createServer((req, res) => {
    const { pathname } = parse(req.url, true);

    if (pathname.startsWith('/api/') || pathname.startsWith('/uploads/')) {
      expressApp(req, res);
    } else {
      nextHandle(req, res, parse(req.url, true));
    }
  });

  // 9. Start listening.
  if (isPipe) {
    server.listen(PORT, () => {
      console.log(`[SAP Security Expert] Unified server on socket: ${PORT}`);
    });
  } else {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`[SAP Security Expert] Unified server ready → http://localhost:${PORT}`);
      console.log(`  INTERNAL_API_URL : ${process.env.INTERNAL_API_URL}`);
      console.log(`  NODE_ENV         : ${process.env.NODE_ENV}`);
      console.log(`  DB_CONNECTION    : ${process.env.DB_CONNECTION || 'mysql'}`);
    });
  }

  // 10. Graceful shutdown (Hostinger / hPanel sends SIGTERM on restart/stop).
  function shutdown(signal) {
    console.log(`[SAP Security Expert] ${signal} received — shutting down`);
    server.close(() => {
      console.log('[SAP Security Expert] HTTP server closed');
      process.exit(0);
    });
    // Force-exit after 10 s if connections don't drain.
    setTimeout(() => process.exit(0), 10000).unref();
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[start.cjs] Fatal startup error:', err);
  process.exit(1);
});
