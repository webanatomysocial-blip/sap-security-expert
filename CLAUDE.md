# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
SAP Security Expert is a community platform for SAP Security, GRC, and BTP professionals. It has a React + Next.js 15 frontend with App Router (SSR mode), backed by a Node.js/Express API server that handles all data, auth, and email.

## Tech Stack
- **Frontend**: React 19, Next.js 15 (App Router, SSR mode — no static export), GSAP for animations, Lenis for smooth scrolling, Axios for HTTP
- **Backend**: Node.js/Express API (MySQL/MariaDB in production, SQLite for local dev)
- **Production serving**: Apache proxies all traffic to the Next.js SSR server (port 3000). Next.js rewrites `/api/*` and `/uploads/*` to the Express API server (port 3001).

## Commands

```bash
# Install Express server dependencies (first time)
npm run api:install

# Development (run both in separate terminals)
npm run api:dev   # Node.js/Express API at http://localhost:3001 (with nodemon)
npm run dev       # Next.js dev server at http://localhost:3000 (proxies /api/* to Express)

# Email queue cron (separate terminal, optional)
npm run api:cron

# Build
npm run build     # Next.js SSR build (output goes to .next/)

# Lint
npm run lint      # ESLint
```

**Express server env**: all config lives in `server/.env` (see `server/.env.example`). SQLite is the default for local dev — `server/database.sqlite` is used automatically when `DB_CONNECTION=sqlite`. For MySQL (production), set `DB_CONNECTION=mysql` with DB credentials in `server/.env`.

## Architecture

### Request lifecycle (production)
1. Browser hits Apache. `.htaccess` proxies every request to **Next.js** (port 3000).
2. Next.js App Router handles the request:
   - `src/app/[category]/[slug]/page.jsx` — **SSR blog post route** (runs server-side, fetches article from Express, renders full HTML for Googlebot). Includes `<ClientApp />` so the interactive SPA loads after.
   - `src/app/[[...slug]]/page.jsx` — **catch-all SPA route** for all other pages. Runs `generateMetadata` (fetches SEO tags from Express `/api/seo-meta`), then renders `<ClientApp />`.
3. Next.js rewrites `/api/*` → Express (port 3001) for all API calls.
4. Once React hydrates, `AppWrapper` removes the SSR pre-render div (`#ssr-blog-content`) and the full SPA takes over.

### SSR blog pages
- `src/app/[category]/[slug]/page.jsx` is a **Server Component**. It fetches the article from `http://127.0.0.1:3001/api/posts/:slug` at request time and renders the full article HTML (title, image, breadcrumbs, content, FAQs, CTA, author card) inside `<div id="ssr-blog-content">`.
- `AppWrapper.jsx` removes `#ssr-blog-content` on mount so users only see the interactive SPA.
- This means Googlebot gets full article HTML in the first byte; users get the full interactive experience.
- `server/seo.js` is **legacy** — it was the old PHP-style injection approach, no longer in the main request path.

### API routing
- Next.js rewrites `/api/*` → `http://127.0.0.1:3001/api/*` (defined in `next.config.js`).
- All API routes live in `server/routes/`. Public routes in `server/routes/public.js`; admin routes in `server/routes/admin/`.
- The Express `/api/seo-meta?path=` endpoint is called by Next.js `generateMetadata` during SSR.

### Frontend structure
- `src/app/layout.jsx` — Next.js root layout (global `<head>` tags, wraps body in `<div id="root">`)
- `src/app/[category]/[slug]/page.jsx` — SSR blog post Server Component
- `src/app/[[...slug]]/page.jsx` — SPA catch-all (generateMetadata + ClientApp)
- `src/app/[[...slug]]/ClientApp.jsx` — `'use client'` wrapper: `dynamic(() => import('../../AppWrapper'), { ssr: false })`
- `src/AppWrapper.jsx` — Bootstraps Lenis, wraps app in all context providers, removes `#ssr-blog-content` on mount
- `src/App.jsx` — All react-router-dom routes
- `src/components/` — Shared UI components; `src/components/admin/` — Admin dashboard components
- `src/views/` — Page-level view components; `src/views/categories/` — One component per content category
- `src/context/` — Four contexts: `AuthContext` (admin session), `MemberAuthContext` (member session), `ToastContext`, `ConfirmationContext`
- `src/services/api.js` — Single Axios instance with CSRF token injection; all API calls go through here
- `src/utils/env.js` — Environment variable helper (`NEXT_PUBLIC_*` for Next.js)

### Authentication
Two separate auth systems coexist:
- **Admin/Contributor** (`AuthContext`): Express session cookie + localStorage (`adminAuth`, `csrf_token`, `userRole`, `userPermissions`). CSRF token is injected into every mutating request header (`X-CSRF-Token`) and into `FormData` payloads.
- **Member** (`MemberAuthContext`): localStorage-only (`memberAuth`, `memberData`, `memberToken`). Syncs with the server on mount; logs out automatically on 401.

`ProtectedRoute` wraps admin routes and checks `AuthContext.isAuthenticated`.

### Blog content
- **Database-driven** (primary): Blogs stored in the `blogs` table, rendered by `DynamicBlog.jsx` via `/api/posts/:slug` client-side, and also by the SSR route server-side.
- **Hardcoded JSX** (legacy): `src/blog-content/*.jsx` — static blog articles as React components, used before the DB system was in place.

### Adding a new content category
Requires changes in three places:
1. **React routes**: Add a route in `src/App.jsx` and a view in `src/views/categories/`.
2. **SEO metadata**: Add an entry to `SEO_CATEGORIES` in `server/routes/public.js`.
3. **BlogLayout / SSR page**: Add to `CATEGORY_LABELS` in both `src/components/BlogLayout.jsx` and `src/app/[category]/[slug]/page.jsx`.

### Express server structure
- `server/index.js` — app entry, mounts all routes
- `server/db.js` — MySQL2 connection pool (or SQLite via better-sqlite3) + auto-publish hook middleware
- `server/middleware/` — `auth.js` (session guard + CSRF), `permissions.js` (RBAC), `rateLimit.js`
- `server/services/` — `MailService`, `NotificationService`, `OTPService`, `CacheService`, `AuditService`
- `server/routes/` — public routes; `server/routes/admin/` — admin-only routes
- `server/cron.js` — standalone email queue processor (run separately)
- `server/seo.js` — legacy SEO middleware (not used; kept for reference)

### Database
All config is in `server/.env`. Required keys: `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`. SQLite dev DB lives at `server/database.sqlite`. Schema reference SQL files are in `server/migrations/`.

### Environment variables
- **Frontend** (`src/`): use `NEXT_PUBLIC_` prefix in `.env.local`; resolved at build time by Next.js.
- **Backend** (`server/`): plain vars in `server/.env`; loaded by `dotenv` at runtime. Key vars: `DB_CONNECTION`, `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`, `SESSION_SECRET`, `SITE_URL`, `CANONICAL_URL`, `INTERNAL_API_URL`.
