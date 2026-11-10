# DEV Optimization Readiness — 2026-11-10

Scope: local `dev-optimization` codebase only. No remote database, server, process manager, Nginx, payment provider, mail provider, upload collection, or production system was changed.

## Implemented locally

- Preserved `5d15aea` login parallel reads, awaited failed-attempt updates, atomic mail-queue claim/rollback, batched inserts, and configurable session pool.
- Set the main MySQL pool to a conservative configurable default of 8 (`DB_POOL_SIZE`).
- Added Sharp 0.33.5 with concurrency 1, disabled cache, EXIF rotation, input validation, no enlargement, 400/800/1200 WebP variants, 100px avatar support, original preservation, and upload fallback.
- Added a dry-run/resumable image backfill with manifest, disk-space reserve, no overwrite, configurable concurrency, and source/output size reporting. Local dry run found one eligible image (890,628 bytes) and estimated 667,971 bytes of variants. No full backfill ran.
- Added responsive variant helpers and original-image fallback to homepage/article image paths; added missing dimensions to applicable homepage images.
- Changed server metadata fallbacks from HTTP to HTTPS and added the new legal routes to sitemap/navigation.
- Added draft Disclaimer and Cookie Policy pages. Both explicitly require business/legal confirmation before production publication.
- Changed the promotional popup to a delayed (9 second) or scroll-triggered compact overlay, persisted dismissal for seven days, excluded sensitive/auth routes, and added keyboard close behavior.
- Removed fabricated Learning Hub instructor names and qualifications; the UI now has an intentional verification-pending state.
- Added the Contact Us complaint option and consistent `Solve to post:` CAPTCHA label.
- Confirmed Total Spent already renders numeric zero as `₹0`.
- Added a prepared-only utf8mb4 migration for `email_queue`; the local schema dump and table-creation path are already utf8mb4. DEV remains unknown until inspection.
- Added `private, no-store` and `nosniff` to non-PDF protected downloads. Direct `/uploads/downloads/*` access remains blocked and one-time tokens remain header-only.
- Added a review-only DEV Nginx proposal. It caches immutable Next assets, moderately caches repository assets, and explicitly avoids API, member, admin, and download caching. It does not cache mutable uploads.

## Existing download files

The local ignored `public/uploads/downloads` directory contains four synthetic-looking `dl_transport_probe_*.zip` files, not the previously reported 20. No private counterpart exists beyond `server/private-downloads/README.txt`. The repository cannot establish whether remote files are referenced without DEV database access. Do not delete these four files until ownership/reference inspection approves cleanup.

## Nginx proposal review

`deploy/nginx.dev-proposed.conf` is documentation only:

- `/_next/static/`: content-hashed assets, one-year immutable browser cache.
- `/assets/`: repository-managed public assets, one-day cache with stale revalidation.
- `/api`, `/admin`, `/member`, `/uploads/downloads`: pass-through with `no-store`; never proxy-cache authentication, OTP, payment, private download, or personalized data.
- `/uploads` is otherwise intentionally not assigned a long cache because uploaded names and invalidation have not been proven immutable.

Before any DEV use: back up the exact active virtual-host file, merge rather than replace unrelated directives, run `sudo nginx -t`, reload DEV only, verify headers as anonymous and authenticated users, and restore the backup plus validate again for rollback.

## Remaining external/manual dependencies

- DEV read-only schema and encoding inspection; migration decision after backup/restore review.
- DEV/production secrets and process configuration; none were changed locally.
- Browser QA at 320, 390, 768, 1024 and 1440 px. No Chromium/Playwright executable is installed in this workspace, so CLS/LCP/FCP/TBT measurements were not fabricated.
- Real homepage and upload corpus backfill estimates; only the small ignored local upload set was scanned.
- Test accounts/data for full admin/member workflows and business approval for legal text, instructor identities, complaint routing, promotional content, and any cleanup of public downloads.
- MariaDB-backed tests require explicit disposable `TEST_DB_*` credentials. They correctly reported skipped in this environment.
- DEV Nginx review/application and server header verification.

## Known technical debt

The production build succeeds. The full ESLint run still reports the repository's pre-existing 110 errors and 13 warnings, chiefly React hook policy, unused values, empty catches, and Fast Refresh rules. Changed-file lint is clean after excluding two pre-existing findings that were corrected in this pass. Dependency audit reports 22 existing advisories (1 low, 8 moderate, 12 high, 1 critical); no broad or breaking dependency upgrade was attempted without a scoped compatibility review.
