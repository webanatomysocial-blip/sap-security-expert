# SAP Security Expert

A community platform for SAP Security, GRC, and BTP professionals — a React + Next.js 15 frontend (App Router, SSR) backed by a Node.js/Express API that handles data, auth, and email.

## Tech Stack
- **Frontend**: React 19, Next.js 15 (App Router, SSR mode), GSAP, Lenis, Axios
- **Backend**: Node.js/Express (MySQL/MariaDB in production, SQLite for local dev)
- **Server**: Apache reverse-proxies to the Next.js SSR server, which rewrites `/api/*` and `/uploads/*` to Express

## Project Structure

```text
├── server/                  # Express API
│   ├── routes/              # Public + admin route definitions
│   ├── controllers/         # Request handlers
│   ├── repositories/        # SQL queries
│   ├── middleware/          # auth, permissions, rate limiting
│   ├── services/            # Mail, Notification, OTP, Cache, Audit
│   └── db.js                # MySQL/SQLite connection + adapter
├── src/
│   ├── app/                 # Next.js App Router (SSR blog route, SPA catch-all)
│   ├── components/          # Shared UI + admin dashboard components
│   ├── views/                # Page-level views (one per category)
│   ├── context/             # Auth, MemberAuth, Toast, Confirmation contexts
│   ├── services/api.js      # Axios instance + CSRF token injection
│   └── App.jsx              # react-router-dom routes (client-side SPA)
├── public/                  # Static assets & uploads
└── deploy/                  # Lightsail deploy/setup scripts
```

## Commands

```bash
npm run api:install   # Install Express server dependencies (first time)
npm run api:dev       # Express API at http://localhost:3001
npm run dev           # Next.js dev server at http://localhost:3000
npm run api:cron      # Email queue processor (optional, separate terminal)
npm run build         # Next.js SSR production build
npm run lint          # ESLint
```

## Security Architecture
- **RBAC**: role-based permissions for Admin, Contributor, and Member accounts
- **CSRF protection**: session-bound token, timing-safe validation on all mutating admin/contributor requests
- **SQL injection protection**: parameterized queries throughout, no string-concatenated SQL
- **Rate limiting**: file-based sliding-window limiter on auth, OTP, and public form endpoints
