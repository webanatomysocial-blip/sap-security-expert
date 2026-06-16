'use strict';
/**
 * Unified entry point for Hostinger Node.js Application Hosting.
 *
 * Runs Next.js SSR + Express API in a single process on the port
 * Hostinger assigns via process.env.PORT.
 *
 * Hostinger hPanel settings:
 *   Application Root : <your project root>
 *   Startup File     : start.cjs
 *   Node.js version  : 20.x
 *   Install command  : npm install
 *   Build command    : npm run build
 */

const path = require('path');
const http = require('http');
const { parse } = require('url');

// 1. Load environment variables from server/.env
//    (covers DB, SMTP, Razorpay, SESSION_SECRET, SITE_URL, etc.)
require('./server/node_modules/dotenv').config({ path: path.join(__dirname, 'server', '.env') });

const PORT_ENV = process.env.PORT || '3000';
const isPipe = isNaN(parseInt(PORT_ENV, 10));
const parsedPort = isPipe ? 3000 : parseInt(PORT_ENV, 10);

// 2. Set INTERNAL_API_URL so Next.js Server Components can reach Express
//    on the same port/process during SSR fetches.
//    If Hostinger uses a Unix socket, we route internal fetches to the public URL.
process.env.INTERNAL_API_URL = isPipe 
  ? (process.env.SITE_URL || 'https://sap.webanatomy.in').replace(/\/$/, '')
  : `http://127.0.0.1:${parsedPort}`;
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

async function main() {
  // 3. Prepare Next.js (SSR, server components, image optimisation etc.)
  //    next is an ES module in Next.js 15, so we use dynamic import.
  const { default: next } = await import('next');
  const nextApp = next({ dev: false, port: parsedPort });
  await nextApp.prepare();
  const nextHandle = nextApp.getRequestHandler();

  // 4. Load the Express app WITHOUT starting its own HTTP server.
  //    server/index.js only calls app.listen() when run as the main module.
  const expressApp = require('./server/index.js');

  // 5. Single HTTP server: routes /api/* and /uploads/* to Express,
  //    everything else to Next.js.
  const server = http.createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    const { pathname } = parsedUrl;

    if (
      pathname.startsWith('/api/') ||
      pathname.startsWith('/uploads/')
    ) {
      // Express handles all API calls and user-uploaded files.
      expressApp(req, res);
    } else {
      // Next.js handles SSR pages, static assets, /_next/*, /public/*, etc.
      nextHandle(req, res, parsedUrl);
    }
  });

  if (isPipe) {
    server.listen(PORT_ENV, () => {
      console.log(`[SAP Security Expert] Unified server ready on named pipe: ${PORT_ENV}`);
    });
  } else {
    server.listen(parsedPort, '0.0.0.0', () => {
      console.log(`[SAP Security Expert] Unified server ready on port ${parsedPort}`);
    });
  }

  // Graceful shutdown on SIGTERM (Hostinger / PM2 sends this on restart)
  process.on('SIGTERM', () => {
    server.close(() => process.exit(0));
  });
}

main().catch((err) => {
  console.error('[start.cjs] Fatal startup error:', err);
  process.exit(1);
});
