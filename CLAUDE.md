# Claude Code Configuration - SAP Security Expert

This file provides context for Claude Code to better understand and index this repository.

## Project Overview
SAP Security Expert is a community platform for SAP Security, GRC, and BTP professionals. It features a React-based frontend and a PHP-based backend.

## Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS (optional/minimal), GSAP for animations, Lenis for smooth scrolling.
- **Backend**: PHP (API-centric), MySQL/MariaDB (default) or SQLite (for local testing).
- **SEO/Routing**: `index.php` serves as the server-side entry point for SEO meta-tag injection and SPA routing.

## Project Structure
- `/src`: React frontend source code.
- `/api`: PHP backend API endpoints and services.
- `/public`: Static assets.
- `index.php`: Main entry point for the production application (PHP-based SEO wrapper).
- `index.html`: Base template for Vite (used by `index.php`).
- `router.php`: Development router for the PHP built-in server.

## Common Commands
- `npm run dev`: Start Vite development server.
- `npm run php-server`: Start local PHP server (at http://localhost:8000).
- `npm run build`: Generate production build in `/dist`.
- `npm run lint`: Run ESLint checks.

## Development Workflow
1. Run `npm run php-server` to start the backend.
2. Run `npm run dev` for frontend development with HMR.
3. API calls from the frontend should be directed to `/api/...`.

## Architecture Notes
- The application uses a hybrid approach where PHP handles the initial request to provide SEO-friendly meta tags and then hands over control to the React SPA.
- Database configuration is managed via `api/.env`.
