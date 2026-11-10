# Final Independent Review — `dev-optimization`

Date: 2026-11-10
Scope: local repository only. No remote database, deployment, process manager, Nginx, DNS, payment provider, mail provider, or production system was changed.

## Decision

**Ready for controlled DEV browser and database validation; not approved for production deployment.**

Three defects were found and fixed: byte-valid images could be stored with a mismatched extension, the prepared email migration could unintentionally tighten legacy nullability, and the backfill disk guard could not be exercised safely with a disposable fixture. Compatible dependency updates also removed all reported critical advisories. Remaining high advisories, DEV database inspection, real-browser measurements, legal approval, and the full upload-corpus backfill remain open.

## 1. Git verification

Reviewed starting point:

- Branch `dev-optimization`; HEAD `4139f26b68b6b115e885b2094cab40cabd48b246`.
- `4139f26` parent `fa90929`: Generate avatar variants for profile uploads.
- `fa90929` parent `b994af5`: Complete SEO legal popup and readiness QA.
- `b994af5` parent `5d15aea`: Add safe responsive image pipeline and runtime hardening.
- Local `main` `a311623fbf73f2715e40a1834dc77782c827160c`.
- `origin/main` `53bc4d6972d456c464e25bb065bc20cfaef8db82`.
- `origin/dev-optimization` `5d15aeae0d0bb1e60f84162b2e6df5ff85eb628c`.

All three commits are linear and pass `git show --check`. The starting tree was clean and three commits ahead of `origin/dev-optimization`. No tracked secret, `.env` value, production credential, live Nginx file, upload, database, or ignored test artifact was added. `server/.env.example` remains the only tracked env-shaped file. Local ignored `.env*`, uploads, databases, and server test fixtures were not staged. No push or deployment occurred.

Reproducibility limitation: `.gitignore` explicitly marks `server/tests/` as local-only and excludes `server/migrations/schema.sql` because it is a full data-bearing dump. Those pre-existing files are absent from the reviewed commits and a clean archive. The committed root tests are self-contained. The full server suite requires securely supplying the separate local test suite and schema fixture; these files were not silently staged or claimed as repository-delivered tests.

## 2. Node 18 compatibility

| Check | Evidence | Result |
|---|---|---|
| Interactive local runtime | `node --version` = `v22.23.2` before review | Informational |
| Deployment runtime | Node `v18.20.4`; npm `10.7.0` | Verified |
| Native SQLite | Clean Node 18 install loaded `better-sqlite3` `11.10.0`; copied local-only SQLite suite passed | Verified |
| Image native module | Clean Node 18 install loaded Sharp `0.33.5`, libvips `8.15.3`; image tests passed | Verified |
| Production build | `npm run build` on Node `18.20.4`, Next `15.5.29` | Passed |

Installing native modules for Node 18 makes that same `node_modules` tree ABI-incompatible with Node 22. That is expected native-addon behavior, not an application defect. Use a clean install whenever changing major Node versions. Project engine declarations were not changed.

## 3. Sharp upload pipeline

Blog, advertisement, member, administrator, contributor, ambassador, and avatar integrations were inspected. Originals remain at existing URLs; generated WebP files are siblings in the same upload directory. Database URLs are not rewritten. Profile integrations generate a 100px avatar; content images generate 400/800/1200 variants without enlargement. EXIF rotation occurs before resize and Sharp concurrency remains one.

Private downloads are outside `public/` and never passed to `ImageService`. Responsive helpers retain the original `src`; errors remove `srcset` and fall back to the original. Existing URLs therefore work before backfill.

Defect fixed: `verifyImageMagicBytes` accepted an allowed magic type even when Multer stored a different extension derived from client MIME. It now requires detected type and normalized stored extension to match, deleting mismatches. Tests cover a real PNG accepted as `.png` and rejected/deleted as `.jpg`.

Optimization failure remains non-fatal to an otherwise valid upload: the original is preserved for later backfill.

## 4. Backfill utility

A disposable fixture at `/tmp/sap-backfill-review.6NidP1` contained JPEG, PNG, WebP, a 120px small image, 1600px large image, invalid JPEG, pre-existing 400px variant, duplicate source bytes, and avatar.

| Check | Result |
|---|---|
| Dry run | Six eligible JPEG/PNG sources planned; no image created or changed |
| WebP input | Correctly excluded as a source |
| Apply | 13 variants present; only missing variants written |
| Originals | SHA-256 unchanged for every source |
| Existing variant | SHA-256 and mtime unchanged |
| Small image | Not enlarged |
| Avatar | Only 100px output generated |
| Invalid image | Recorded `error`; other files completed |
| Manifest | Six sources, one error, byte totals and reserve recorded |
| Resume | Second apply preserved all variant hashes and mtimes |
| Disk guard | Forced with oversized reserve; exited 1 before image writes |

`IMAGE_BACKFILL_MIN_FREE_BYTES` now permits controlled disk-guard tests and unusual filesystems; default remains 100 MiB. The full local or remote upload collection was not backfilled.

## 5. SEO, HTML, and performance

Measured from a local Node 18 production server with the API intentionally unavailable:

- Initial homepage HTML: 52,749 bytes.
- Title: `SAP Security Expert | Global Community for SAP Professionals`.
- Exactly one description, canonical, Open Graph URL, and H1.
- Canonical is HTTPS and meaningful homepage text is server-rendered.
- `robots.txt` has the HTTPS DEV host/sitemap and excludes protected routes.
- Static, blog-detail, tag/category, robots, and sitemap paths were inspected. Client logic updates existing metadata rather than adding another canonical/description.
- `ROBOTS_NOINDEX=true` remains a global `X-Robots-Tag: noindex, nofollow, noarchive`; DEV must set and verify it.

The build reports 105 kB shared first-load JavaScript (46.6 + 54.2 + 4.21 kB), 110 kB for the generic route, and 115 kB for blog detail. The API-free fallback has no homepage API images, so it cannot provide meaningful LCP/image timing evidence.

No browser engine is installed. CLS, LCP, FCP, TBT, popup focus/scroll behavior, and real API-backed image selection remain external browser checks; no performance improvement is claimed from source inspection.

## 6. Frontend and download review

Source and tests confirm seven-day promotional dismissal, Escape/button dismissal, compact mobile bottom-card CSS, consent-manager integration, login/reset/change-password routes, complaint option, consistent CAPTCHA label, numeric `₹0` Total Spent, verification-pending instructor state, legal navigation/footer links, Country Ambassador labels, and featured-content wiring.

Disclaimer and Cookie Policy are drafts requiring business/legal approval. Actual 320/390/768/1024/1440px interaction testing remains required.

Protected streams require authentication, entitlement-issued tokens, and `X-Download-Token`. Query tokens are rejected, tokens expire and are single-use, non-PDF responses use `private, no-store`, and PDF watermark failure never serves the original. Private files remain outside public image/static roots. Real HTTP transport tests passed; DEV must still verify entitlement and active proxy/static routing.

## 7. Email and database

Defect fixed: the prepared migration used `MODIFY ... NOT NULL` although legacy definitions may differ. It now uses:

```sql
ALTER TABLE email_queue
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

This preserves existing types/nullability and rows while converting recipient, subject, and body. The migration documents that narrowing the character set can be lossy and directs operators to restore the independently verified encrypted backup. Application table creation already uses utf8mb4; no Latin-1 `email_queue` creation was found.

No migration ran. DEV schema/row inspection, encrypted backup creation, independent restore proof, and post-migration Unicode verification are prerequisites.

## 8. Dependency security

Original audits reported root `19` findings (`13` high, `2` critical) and server `22` (`12` high, `1` critical). Scoped Node-18-compatible changes were fully retested:

- Next `15.5.20` → `15.5.29`; Axios root/server → `1.21.1`.
- React Router DOM `6.30.2` → `6.30.6`.
- Compression `1.8.1` → `1.8.2`; Multer `2.2.0` → `2.5.0`.
- Direct MySQL2 `3.22.4` → `3.24.6`; compatible Body Parser/Proxy Addr lock updates.
- Unused `react-quill@0.0.2` removed, eliminating its obsolete Quill/Lodash critical chain.

Final audits: root `13` total (`8` high, `0` critical); server `16` total (`7` high, `0` critical).

| Tree/package/path | Kind/use and reachability | Safest fix / compatibility |
|---|---|---|
| root `brace-expansion@1.1.15` via ESLint | Transitive development; lint input only | Refresh ESLint tree |
| root `browserslist@4.28.4` via Babel/lint | Transitive development; build config only | Refresh Babel/lint tree |
| root `js-yaml@4.3.0` via ESLint | Transitive development; local lint config | Refresh ESLint tree |
| root `nanoid@3.3.15` via Next/PostCSS | Transitive framework; vulnerable custom generators unused | Framework/PostCSS refresh |
| root `postcss@8.5.16` via Next | Transitive build; repository CSS only | Audit proposes breaking Node-20 Next 16; defer runtime migration |
| root `sharp@0.34.5` via Next | Transitive runtime optimizer; potentially reachable | Fixed Sharp requires Node 20.9; runtime/Next migration |
| root `source-map-js@1.2.1` via PostCSS | Transitive build; repository source maps | PostCSS/framework refresh |
| root `zod@4.3.6` via Next | Transitive framework runtime; no direct app call | Next-compatible refresh when available |
| server `brace-expansion@5.0.6` via Nodemon | Transitive development; dev file patterns | Nodemon/minimatch refresh |
| server `mysql2@3.10.2` via `express-mysql-session@3.0.3` | Transitive runtime; hostile/MITM DB or compression needed | Test a session-store override/upgrade on disposable MariaDB; audit suggests a breaking downgrade |
| server `nanoid@3.3.15` via sanitize-html/PostCSS | Transitive runtime tree; custom generators unused | Sanitize/PostCSS refresh |
| server `nodemailer@6.10.1` | Direct runtime; address parser/SMTP used, advanced raw APIs unused | `10.4.0` is breaking and Node >=20; runtime/mail migration |
| server `postcss@8.5.16` via sanitize-html | Transitive runtime tree; source-map loading not invoked | Sanitize/PostCSS refresh |
| server `sharp@0.33.5` | Direct runtime; uploads reachable, SVG/HEIF rejected by type allowlist | `0.35.5` requires Node >=20.9; runtime migration |
| server `source-map-js@1.2.1` via PostCSS | Transitive runtime tree; no source-map input found | PostCSS refresh |

Original critical Next, Proxy Addr, and Lodash paths are gone. No `npm audit fix --force` or broad major upgrade was used.

## 9. Test evidence

Final commands used Node `v18.20.4` unless stated:

| Command | Result |
|---|---|
| `npm run test:codebase` | 12/12 passed |
| `for test_file in server/tests/*.test.js; do node "$test_file"; done` | 19 local-only files (172 checks) passed; 0 failed |
| `node server/tests/db/run.js` | Six MariaDB files correctly skipped: no disposable loopback credentials |
| `npm run build` | Passed on Next 15.5.29; one existing CSS `end` compatibility warning |
| changed-file `eslint` | Passed |
| `git diff --check` | Passed |
| disposable backfill dry/apply/resume/guard | Passed as in §4 |

The suite covers admin preview sanitisation, auth/CSRF, reset links, session revocation, membership, ownership, permissions, mocked payments, mail queue claims, OTP HMAC, external-service isolation, and download transport. A clean `git archive` independently passed installation, 12 committed tests, native-module loading, and the production build. After copying the intentionally ignored tests and schema fixture into that archive, all 19 local-only files passed. MariaDB lock/schema assertions remain explicitly unavailable, not passed.

## 10. Readiness matrix

| Area | Classification | Remaining prerequisite |
|---|---|---|
| Git history/scope | Verified and complete | Commit locally; do not push without approval |
| Node 18 native compatibility | Verified and complete | Clean DEV install |
| Upload type validation | Defect found and fixed | DEV upload regression |
| Sharp pipeline | Verified and complete locally | Real corpus/browser validation |
| Backfill | Verified on fixture | DEV dry-run, storage review, backup; no full apply |
| SEO/SSR | Verified locally | DEV headers and browser validation |
| Frontend | Verified but requires external testing | Responsive browser accounts/data |
| Legal copy | Requires business approval | Counsel/business sign-off |
| Downloads | Verified locally; external check required | DEV entitlement/proxy tests |
| utf8mb4 migration | Defect fixed; not executed | DEV inspection, encrypted backup and restore proof |
| Dependencies | Unresolved high findings | Node/runtime migration and scoped upgrades above |
| MariaDB tests | Requires external testing | Disposable loopback credentials |
| Web performance | Requires external testing | Browser/Lighthouse measurements |

Files changed by this review: root/server package manifests and lockfiles, `server/utils/helpers.js`, `server/scripts/backfill-image-variants.js`, `server/migrations/2026-11-10_email_queue_utf8mb4.mysql.sql`, `tests/seo-and-tracker.test.mjs`, new `tests/upload-validation.test.mjs`, and this report.

No DEV/production migration, purge, backfill, restart, Nginx change, DNS change, push, or deployment was performed.
