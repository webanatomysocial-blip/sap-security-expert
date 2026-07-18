# Changelog

## [3.4.0] - 2026-07-18

### Added
- **Exclusive article toggle in blog editor** — admin can enable "Members Only" directly from the blog editor with a modal prompt for preview paragraphs, matching the Premium flow
- **Preview paragraphs modal for exclusive toggle in blog list** — enabling exclusive from the quick-toggle in the list now prompts for preview paragraphs instead of applying immediately
- **Location field in admin Users table** — location is now a toggleable column in the admin members table and included in CSV export
- **Canonical tags on all public pages** — `alternates.canonical` added to layout base metadata as fallback; admin/member routes now explicitly set `robots: noindex, nofollow`
- **"Downloads" header link** — replaced "Resource Library" placeholder with a working link to `/downloads` in both desktop nav and mobile menu
- **`/uploads/profiles` and `/uploads/contributors` static serving** — profile and contributor images now return HTTP 200; replaced two hand-crafted static routes with a single `/uploads` catch-all that blocks `/uploads/downloads` (protected)

### Fixed
- **`unlockBlog` 500 in production (critical)** — `db.getConnection()` was called on a `PoolConnection` which has no such method; transaction now runs directly on `req.db` matching the existing pattern
- **Blog self-approval vulnerability** — self-approval guard compared against `blog.author_user_id` (always `undefined`); corrected to `blog.author_id` — contributors with `can_review_blogs` could previously self-approve and earn 20 credits
- **CORS localhost origins in production** — `localhost`/`127.0.0.1` origins with `credentials: true` are now only added to the allowlist when `NODE_ENV !== 'production'`
- **GTM script hydration mismatch** — added `suppressHydrationWarning` to the GTM inline `<script>` tag; nonce differs between SSR and client causing a React hydration error
- **Exclusive ↔ Premium mutual exclusion** — enabling one now clears the other in the editor UI (checkboxes disable each other), in the modal confirm, and at the database layer (`updateExclusive` clears `is_premium`; `updatePremium` already cleared `is_members_only`); full-save path in `postsRepository` also enforces the rule
- **RTE editor defaults to visual mode** — `isSourceView` initial state changed from `true` to `false`
- **Download button shows credit cost after unlock** — button now always reads "Download" without "· N cr"; credit cost is still shown in the file card badge
- **`NULLIF(?, "")` double-quote syntax in `postsRepository`** — MySQL in standard mode treats `"` as an identifier; changed all three occurrences to single quotes

### Security
- CORS localhost origins gated behind non-production check
- Blog self-approval guard fixed (contributor privilege escalation)
- `unlockBlog` transaction integrity restored in production MySQL

### Database / Migration
- Added migration file `server/migrations/mysql_missing_tables_and_columns.sql`:
  - Creates `credit_activities` table with 9 default seeded activities
  - Creates `site_settings` table with default `paywall_default_preview_paragraphs = 3`
  - Creates `member_file_downloads` table
  - Adds `preview_paragraphs` column to `blogs` table
  - Adds `UNIQUE INDEX idx_pv_dedup` on `post_views (post_id, visitor_token(64))`
  - Adds performance indexes on `blogs`, `comments`, `post_views`, `members`, `member_blog_unlocks`, `credit_transactions`

## [3.3.0] - 2026-07-15
### Added
- Download credits feature — members spend credits to download files attached to blog posts
- Protected file downloads with one-time session tokens (copied URLs are rejected)
- Downloads tab in member credits page showing all purchased downloads with re-download button
- Insert Download Block in blog editor for Downloads category
- SQLite session store — member sessions now survive server restarts

### Fixed
- Member login redirect — after login, returns to the original page instead of home
- Credit activity tracking for file downloads

## [3.2.0] - 2026-07-10
### Added
- Credit activities system — admins can configure how many credits each activity awards
- Paywall paragraph selector — admins can choose exactly which paragraph triggers the paywall
- Downloads category for blog posts

### Fixed
- RTE editor cursor position after inserting content blocks

## [3.1.0] - 2026-07-02
### Added
- Credit bundles — members can purchase credits via Razorpay
- Coupon code support for credit purchases
- Member referral system — earn credits for approved referrals
- LinkedIn share bonus credits
- Complete profile bonus credits

### Changed
- Replaced subscription model with credit-based article unlock system

## [3.0.0] - 2026-06-15
### Added
- Full platform relaunch with Next.js 15 App Router
- SSR blog pages for SEO (Googlebot gets full HTML on first byte)
- Member authentication system separate from admin auth
- Admin contributor management
- Blog editor with rich text editor
