import { NextResponse } from 'next/server';

// Applies security headers to every page response. This previously lived only
// on the Express API (server/index.js) — but Express never serves HTML (see
// CLAUDE.md: "All HTML is served by Next.js"), so the CSP/X-Frame-Options/etc.
// set there never actually reached the browser on a real page. This is the
// header set users' browsers receive.
//
// script-src uses a per-request nonce instead of 'unsafe-inline': Next.js
// automatically applies this nonce to its own framework-injected scripts
// (hydration bootstrap, chunk loaders) once it sees `x-nonce` on the request
// headers — see https://nextjs.org/docs/app/guides/content-security-policy.
// App-authored inline scripts (the two JSON-LD blocks in layout.jsx and the
// blog SSR page) read the same nonce via `headers()` and set it explicitly.
export function middleware(request) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV !== 'production';

  const csp = [
    `default-src 'self'`,
    // 'unsafe-eval' is only needed for webpack Fast Refresh in dev — production
    // React/Next.js bundles don't eval().
    `script-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : ''} https://checkout.razorpay.com`,
    // style-src keeps 'unsafe-inline': React's style={{}} prop sets styles via
    // the DOM style API (not governed by CSP either way), but Next's dev
    // overlay and third-party CSS (Bootstrap Icons, Google Fonts) inject
    // literal <style>/<link> tags that would need per-tag nonces we don't
    // control the source of. This is the standard, low-risk compromise most
    // CSP guides (including Google's) recommend for style-src specifically.
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net`,
    `font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net`,
    `img-src 'self' data: https:`,
    `connect-src 'self' https://api.razorpay.com`,
    `frame-src https://api.razorpay.com https://checkout.razorpay.com`,
    `object-src 'none'`,
    `base-uri 'self'`,
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

export const config = {
  // Runs on page requests only — API routes are Express's own responses
  // (proxied/rewritten, not rendered by Next) and static assets don't need it.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|assets|uploads).*)'],
};
