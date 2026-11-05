# SAP Security Expert: Security Remediation, Migration and DEV Readiness Report

Scope: SAP Security Expert only. Local work only. Nothing pushed, deployed, or run against DEV or production.

## 1. Verified repository

| Item | Value |
|---|---|
| Path | `/Users/webanatomy/Desktop/sap-security-expert-new` |
| Branch | `main` |
| HEAD at start of this pass | `cc13e2b` (Stage 3 prep) |
| Working tree at start | clean |
| Remote (not used) | `origin` → `webanatomysocial-blip/sap-security-expert` |
| Node used for all tests and builds | v22.23.2 (nvm, `/Users/webanatomy/.nvm/versions/node/v22.23.2/bin`) |
| npm | 10.x with Node 22 |
| Next.js | `^15.0.0` (installed), react `^19`, express 4 (server) |
| System Node on this Mac | **broken** (Homebrew Node 24.5.0 cannot load `libsimdjson.26`); not changed in this pass. See §10. |

No dependency was installed or upgraded in this pass. The packages already present were used.

## 2. Status legend

- **DONE**: code changed and committed locally.
- **TESTED**: verified by an automated suite or a browser run, with the evidence listed.
- **PREPARED**: script or document ready; not run against DEV or production.
- **REQUIRES DEV**: needs the DEV database or host, which was not available here.
- **NOT DONE**: not implemented or not verified in this pass.

## 3. Security fixes

| # | Item | Status | Evidence |
|---|---|---|---|
| A1 | Reset link moved to the URL fragment (`/reset-password#token=…&email=…`). The browser never sends a fragment to the server. | DONE, TESTED | `server/utils/resetLink.js`; `server/tests/reset-link.test.js` (7/7); browser run in §6 |
| A2 | Legacy `?token=` links still accepted for in-flight mail; the page moves the values into the fragment and drops the query. | DONE, TESTED | `src/utils/resetLink.js`, `src/views/ResetPassword.jsx`; browser run (legacy URL rewritten to fragment, form shown) |
| A3 | Application logs redact `email` as well as token-like parameters. | DONE, TESTED | `server/utils/logSafe.js`; test; app log grep in §6: 0 occurrences of token, `token=`, or email |
| A4 | Nginx access-log map strips query strings for **all** paths (was only `/api/downloads/stream`). | DONE (template only, not applied) | `deploy/nginx.conf` map; see §8 |
| A5 | Reset tokens: hashed storage (SHA-256), expiry enforced, single use, wrong guess does not consume the real token. | TESTED on MariaDB 10.11.19 | `tests/db/auth-permissions.db.test.js` (reset cases) |
| B1 | Admin review preview: stored body and draft sanitised with `sanitizeBlogHtml` on the admin read path (pending list and body endpoint). | DONE, TESTED | `server/controllers/admin/blogsController.js`; `tests/admin-preview-sanitise.test.js` (4/4); browser: legacy payload (`<script>`, `onerror`, `javascript:` href, `onclick`) produced no script execution and no unsafe attributes |
| B2 | Sanitiser hardened: inline `style` containing `url(`, `expression(`, `javascript:`, `@import` or `behavior:` is removed. Other styles and all allowed formatting are kept. | DONE, TESTED | `server/utils/sanitize.js` `transformTags`; `tests/admin-preview-sanitise.test.js` |
| D1 | **Member session not ended when an admin suspended or deactivated the member.** The session trusted the status copied at login. | DONE, TESTED (browser and DB) | `server/services/sessionRevocation.js` (`isMemberBlocked`, per-request check). Browser: open member session returned `401 Your session has ended` after admin suspend. DB suite: suspend, soft-delete and record-removed cases. |
| D2 | Staff account changes (deactivation, demotion, contributor removal) take effect within the 15 s access cache. The window is tested and documented. | TESTED | `tests/db/auth-permissions.db.test.js` (cache-window case) |
| C1 | Download token: header transport only; query tokens ignored. Code search found no logging of download tokens (only `console.error` of error messages and stacks). | TESTED (transport); code search (logging) | `tests/download-transport.test.js` (4/4). Not verified in a browser download. |
| — | Login/logout CSRF, password change revocation, session rotation on login. | TESTED | `tests/session-csrf.test.js` (8/8); `tests/session-revocation.test.js` (12/12); DB suite; browser login with CSRF |
| — | Admin member suspend/reactivate via API, confirmed in DB. | TESTED | API calls in §6 |

### Not fixed (open)

| Risk | Detail | Recommendation |
|---|---|---|
| R1 | ~~Reset token burned on failure after claim.~~ **FIXED (round 2).** Claim, password update, session revocation and token deletion run in one transaction. Verified on MariaDB: a forced failure after the claim restores the token and leaves the password unchanged; the same token then succeeds; two simultaneous requests with one token yield exactly one success. | — |
| R2 | ~~OTP codes queued in plaintext.~~ **FIXED (round 2).** Delivery failure no longer queues the code. Only the SHA-256 hash is stored. `queueTransactional` was removed from `MailService`. **Open:** existing rows in `email_queue` written before this fix may still hold plaintext OTPs on DEV and production. Purge them after review (see §13). | — |
| R3 | Reset email contains the token in the message body. Mail providers and recipients can log it. | Expected for email links; shorten lifetime if needed (currently 60 min). |
| R4 | Nginx error log can record request lines for some errors (default `error_log`). | Keep tokens out of URLs (done for reset and downloads); see §8. |
| R5 | Repo-wide `dangerouslySetInnerHTML` on server-sanitised content only (reviewed); the JSON-LD and GTM scripts are static. | No action. |
| R6 | ~~Unsalted SHA-256 of six-digit codes; recoverable in seconds if the table leaked.~~ **FIXED (round 3):** codes are HMAC-SHA-256 digests keyed by `OTP_HASH_SECRET` (≥32 random bytes), compared in constant time, and the key is required at startup. Remaining step is operational: set the key on DEV and production (§8b.1, §14). |
| R7 | **`verification_codes.code` is `varchar(10)` in the schema dump and on any database built from it.** OTP hashes are 64 characters, so under strict SQL mode every OTP insert fails (`Data too long`), which breaks signup and password-reset codes. Found by the MariaDB test in round 2; SQLite does not enforce length, so the earlier SQLite tests could not catch it. | Apply `migrations/2026-11-05_widen_verification_codes.mysql.sql` after review. Check DEV first with `scripts/schema-check-readonly.js`. Fresh builds from the updated `schema.sql` are already correct. |

## 4. Migration readiness

Migrations and their tests are in `server/migrations/` and `server/scripts/`. All apply, backfill, rollback and restore behaviour was verified on **disposable MariaDB 10.11.19** (Homebrew `mariadb@10.11`, port 3317, datadir in the scratchpad). Nothing was run against DEV or production.

| Migration | Target tables / columns | Dry run | Apply | Idempotent | Rollback / restore | Status |
|---|---|---|---|---|---|---|
| File ownership DDL | `file_ownership`, `file_ownership_audit` | n/a (DDL) | applies twice without error | yes | `…rollback.sql` drops both tables and the audit rows for upload/backfill/admin-claim sources | TESTED |
| File ownership backfill | writes `file_ownership` (+ audit) from `blogs.content/draft_content` | writes nothing (checksum-verified) | inserts one owner per unowned file | second run inserts 0 | restore via dump (below) | TESTED |
| URL normalisation | `blogs.cta_button_link`, `blogs.draft_cta_button_link`, `ads.link`, `announcements.link`, `announcements.draft_link`, `contributors.linkedin|personal_website`, `contributor_applications.linkedin|personal_website`, `users.linkedin|personal_website` | writes nothing | rewrites bare domains to https; reports unsafe values as MANUAL | second run: 0 rewrites | `--restore=<backup>` (compare-and-set) | TESTED |
| News/learnings sanitisation | `blogs.content`, `draft_content`, `faqs`, `draft_faqs` for `type` news/learning | writes nothing | rewrites changed fields | second run: no further change | `--restore=<backup>` | TESTED |
| Widen OTP code column (round 2) | `verification_codes.code` → `VARCHAR(64)` | `information_schema` check (schema-check-readonly.js) | `ALTER … MODIFY` is idempotent | yes | rollback documented: delete rows longer than 10 chars, then narrow. Not run. | PREPARED, REQUIRES DEV |
| Read-only inventory | none | `scripts/inventory-readonly.js` | never writes (READ ONLY session; a write was refused in test) | n/a | n/a | TESTED |

### Backup and restore rules (enforced in code)

- Ownership apply requires `--backup=<file>` that already exists and is non-empty. The script no longer writes a URL-list "backup", which could not restore a database.
- All three scripts create backup files exclusively (`wx`). An existing backup is never overwritten.
- Every write is compare-and-set (`WHERE id=? AND col=<value read>`). A row changed since it was read is skipped, not overwritten. Restore uses the same rule.

### Verified in the disposable database

- Dry runs change no table checksum and create no tables.
- DDL applies twice. Backfill is idempotent. The earliest live author owns a file, with a regression for a weekday-name sort bug (§4.1).
- Restore of the URL and sanitisation backups returns the data exactly to its original checksum. Re-applying after restore reproduces the first apply.
- `mariadb-dump --single-transaction` of the pre-ownership database restores into a scratch database with the expected 8 post rows.
- Refusals exit with code 2 (no backup, empty backup, missing confirmation, existing backup).

#### 4.1 Bugs found and fixed while testing

1. **Wrong ownership owner on MariaDB.** `planBackfill` sorted `created_at` with `String(Date)`, which orders by weekday name. A file could be owned by the later author. Now sorted by epoch milliseconds. Regression: `tests/file-ownership.test.js` and `tests/db/migrations.db.test.js`.
2. **Dry runs could alter DEV.** Migration scripts required `db.js`, which runs `ALTER TABLE`/`DROP INDEX` on load for MySQL. Scripts now use `scripts/lib/migration-db.js`. Verified: dry runs leave the table count unchanged.
3. **Overwritten backups and an unrestorable "backup".** Fixed as above.
4. **Ambassador table could not be created on MariaDB 10.11.** `current_role` in `db.js` `ensureMySQLTables` was unquoted; MariaDB rejects it. Now quoted with the backtick escaped inside the template literal. Verified: app startup now creates `ambassadors` with no DB error.

### Manual decisions required before a real run

- Each unsafe URL reported as MANUAL (`javascript:`, `data:`, junk) needs an admin decision: replace it or clear it. The script never writes these.
- Ownership rows flagged `needs_review` (several authors, or conflicting prices, or no live post) need a decision.
- Unregistered files cannot be claimed automatically by contributors.

### Ownership rollback limitations (read before any real run)

The rollback drops `file_ownership` and `file_ownership_audit`, which removes the audit trail, including admin price overrides. Before any real migration:

1. Export the audit table: `mariadb-dump --single-transaction DB file_ownership file_ownership_audit > ownership-audit-$(date +%F).sql`
2. Take a full dump: `mariadb-dump --single-transaction DB > full-pre-migration-$(date +%F).sql`
3. Verify the dump restores into a scratch database (the test in `tests/db/migrations.db.test.js` does this for the dump format).
4. Keep the application version that matches the schema before the migration available to roll back to.
5. Roll back in this order: stop writes (put the site in maintenance or stop PM2 DEV), roll back the application code, then run the rollback SQL. Running the old code against a dropped table fails on uploads and post saves.

## 5. DEV database read-only inventory

- Command (run on DEV, from the repo root, with a SELECT-only account):

  ```
  DB_CONNECTION=mysql DB_HOST=<host> DB_PORT=3306 DB_NAME=<dev_db> DB_USER=<select_only_user> DB_PASS=<password> \
    node server/scripts/inventory-readonly.js
  ```

- Connection requirements: MariaDB 10.11 on loopback or a private host; user with `SELECT` on the database only. The script opens a READ ONLY session and runs `SET SESSION TRANSACTION READ ONLY`. A write was verified to be refused (`ER_CANT_EXECUTE_IN_READ_ONLY_TRANSACTION`).
- The script does not load `db.js`, so no schema change can happen on DEV.
- Output sections: `posts` (total and by status), `files` (distinct embedded files, files without an owner row, shared files, ambiguous files and reasons), `urls` (per column: ok / rewrite / manual), `urlsNeedingManualDecision`, `newsLearnings` (rows, fields needing sanitising, rows with non-array FAQ JSON).
- **Status: REQUIRES DEV.** Credentials are not in the repo, and none were guessed. No DEV counts are reported in this document.

## 6. Browser verification (local only)

Environment: production build, `NODE_ENV=production`, `MAIL_MODE=mock`, `ZOHO_MODE=mock`, `PLAGIARISM_API_TOKEN` blank, disposable database `sse_test_browser` built from the 26 `CREATE TABLE` statements only (no rows from `schema.sql`). Accounts are seeded test accounts. A local forwarding proxy on `localhost:3444` adds `X-Forwarded-Proto: https`, because the app sets `Secure` cookies and `trust proxy = 1` (the same as behind Nginx).

| Area | Result | Notes |
|---|---|---|
| Password reset (fragment link) | PASS | Opened from a fresh page, form filled, submitted; redirected to member login. Token row consumed. |
| Password reset (legacy `?token=`) | PASS | Form shown; address rewritten to fragment form. |
| Logs after reset | PASS | Application log: 0 occurrences of the raw token, `token=`, or the test email; legacy request with sentinel token also absent from the log. |
| Member login after reset | PASS | Profile endpoint returns 200 with new password. |
| Member session after admin suspend | PASS | Open session got `401 Your session has ended`. Member reactivated afterwards. |
| Admin login (UI) | PASS | Dashboard loaded. |
| Admin review preview, legacy payload | PASS | No script execution, no `javascript:` links, no inline handlers in the rendered preview. |
| Login CSRF | PASS (earlier) | Login without token refused (403); with token accepted. |
| Session cookie lifetime | PASS | `Set-Cookie` carries `HttpOnly; Secure; SameSite=Lax`, `Expires` ≈ 8 h. |
| Contributor login/logout, ambassador login | NOT DONE | |
| Membership checkout (Razorpay test mode), payment success/failure, webhook | NOT DONE | Requires Razorpay checkout over the network; webhook HMAC test not run. |
| Uploads, file ownership UI, shared files, price control, admin override, deletion protection | NOT DONE | Covered by unit and DB tests only. |
| Paid downloads via header in browser | NOT DONE | Header transport covered by `download-transport.test.js`. |
| Comments, FAQ, announcements, news, learnings, contributor content | NOT DONE | Sanitisers covered by `content-security.test.js` and `admin-preview-sanitise.test.js`. |
| Declined-application resubmission | NOT DONE | Covered by code-path review only. |

Session and cookie defects found by browser testing: the production cookie is `Secure`, so plain-HTTP local testing cannot hold a session. The local proxy above is test-only and is not part of the application.

## 7. Permission matrix and session tests

### Database-backed (MariaDB 10.11.19, `tests/db/auth-permissions.db.test.js`): 17/17 passed

Real middleware (`requireAuth`, `requireAdmin`, `checkPermission`, `refreshStaffPermissions`, `requireMemberAuth`, `enforceSessionRevocation`), real repositories and the real reset controller, against a disposable database.

Covered: admin; approved contributor (blog grant; ads grant refused; admin refused); contributor without grants; ambassador (contributor login, application not approved); member; member suspended; member soft-deleted; member record removed; deactivated admin; deactivated contributor's permission after refresh; role demotion with a contributor record (role synced; admin refused after cache refresh; cache window documented); role demotion without a contributor record (session ended, fails closed); contributor removed; password change (other devices ended, current kept); reset token SHA-256 storage, single use, expiry, wrong-token behaviour.

Not covered by DB tests: session expiry in the store (the cookie lifetime was checked, store TTL was not).

## 8. Nginx (recommended, not applied to any server)

Status of the Nginx change, separated into the four states that matter:

| State | Status |
|---|---|
| Configuration file prepared (`deploy/nginx.conf` in the repo) | DONE |
| Configuration installed on a server | NOT DONE (DEV or production) |
| `nginx -t` passed on that configuration | NOT DONE (Nginx is not installed on this Mac; installing it could upgrade shared libraries, as the earlier Node incident showed) |
| Access and error logs verified to contain no tokens | NOT DONE (needs DEV, after install and a real request) |

The sections below describe the prepared configuration only.

`deploy/nginx.conf` (repo template) now contains:

```
map $request_uri $loggable_uri {
    ~^(?<path>[^?]*)  $path;
}
log_format redacted '$remote_addr - $remote_user [$time_local] "$request_method $loggable_uri $server_protocol" '
                    '$status $body_bytes_sent "$http_referer" "$http_user_agent"';
access_log /var/log/nginx/sap-security-expert.access.log redacted;
```

- Access log: query strings are never written.
- Referer: the reset link uses a fragment, which browsers do not send in Referer. The `$http_referer` field still records the referring page path.
- Error log: the template sets no `error_log`, so the distribution default applies, which can record request lines for some upstream errors. Recommended: `error_log /var/log/nginx/sap-security-expert.error.log warn;` and keep secrets out of URLs (done for reset and downloads). Legacy `?token=` links remain valid for at most 60 minutes after deployment; remove the legacy branch after that window.
- Not validated with `nginx -t`: Nginx is not installed on this Mac, and installing it with Homebrew could upgrade shared libraries, as the earlier Node incident showed.


## 8a. Round 2 changes (this review pass)

| Change | Evidence |
|---|---|
| Reset-token consumption, password change, session revocation and token deletion in one transaction (`controllers/otpController.js` `resetWithToken`). `ensureRevocationTable` runs before `BEGIN`, because MySQL/MariaDB DDL commits an open transaction. | `tests/db/reset-atomic.db.test.js`: 4/4 on MariaDB 10.11.19. Against the previous controller, the failure-after-claim test fails (token burned, `2 passed, 2 failed`), so the test detects the bug. |
| OTP delivery failure no longer queues the code; `queueTransactional` removed. | `tests/db/otp-delivery.db.test.js`: 3/3. Forced SMTP failure: `email_queue` stays empty; stored value is 64 chars, not a six-digit code. |
| Schema width for OTP hashes (`verification_codes.code` → 64) in `migrations/schema.sql`, plus a prepared migration. | `tests/migration-prep.test.js` schema check (10/10 in pure suite). Found by `tests/db/otp-delivery.db.test.js`, which failed with `Data too long for column 'code'` before the fix. |
| Read-only schema drift checker `scripts/schema-check-readonly.js` (information_schema SELECT only, READ ONLY session). | Run against a database built from the dump's CREATE statements: reports 6 of 14 expectations not met (missing `ambassadors`, `ambassador_badge_history`, `contributors.approved_at`, `account_session_revocations`, `file_ownership`, `file_ownership_audit`). Run on DEV to compare. |
| Lint: numeric separator in an existing test fixed (parser is ES2020). | ESLint on all changed files: exit 0. |

Totals after round 2 (Node 22.23.2, MariaDB 10.11.19):

| Command | Exit | Result |
|---|---|---|
| `cd server && npm test` | 0 | 16 suite summaries, 154 checks passed, 0 failed |
| `TEST_DB_* npm run test:db` (sse_test_suite) | 0 | 4 suites: auth-permissions 17/17, migrations 9/9, otp-delivery 3/3, reset-atomic 4/4 — 33 checks, 0 failed |
| `npm run build` | 0 | Compiled successfully |
| `npx eslint` on changed files | 0 | clean |

The `ECONNREFUSED 127.0.0.1:3001` prerender messages remain. They are not investigated yet: the build succeeds, but whether every statically prerendered page is complete when the API is up has not been checked.


## 8b. Round 3: keyed OTP hashing, DEV schema inspection, legacy OTP purge preparation

### 8b.1 Keyed OTP hashing (implemented)

- Codes are stored as **HMAC-SHA-256** digests (64 lowercase hex characters). The message is `otp-v1|<lowercased email>|<type>|<code>`, so equal codes for different records produce different digests. Implementation: `server/services/OTPService.js`.
- Key: `OTP_HASH_SECRET`, a hex string encoding **at least 32 random bytes** (64 hex characters). Odd length, non-hex, short, empty, or missing values are refused.
- **No fallback.** The server refuses to start without a valid key (`server/index.js`, checked before the app is created). Requests that would create a code also refuse, and write nothing.
- The key is read at call time, so it is never cached in a stale state. It must be identical on every instance that verifies codes. Use one value per environment and never share a value between DEV and production.
- Verification compares digests with `crypto.timingSafeEqual`, not an SQL `WHERE code = ?`.
- Single use: the verify step moves the row from `pending` to `verified` with `WHERE status = 'pending'` and requires exactly one affected row, so two concurrent submissions cannot both succeed.
- Attempts: five wrong codes lock the code. Expiry: 10 minutes (DB-side `NOW()`).
- No logging of codes, digests or the key. Configuration errors are logged server-side as a fixed sentence and answered to clients with a generic `500 Service temporarily unavailable.`, so no client learns the variable name.
- Existing pending codes hashed with the old SHA-256 **no longer verify**. They expire within 10 minutes. Users request new codes. This was approved.

**Configuration requirement (every environment):**

```
OTP_HASH_SECRET=<64+ hex characters>
```

Generate a value (run on the machine that holds the environment file; do not paste the output into chat, reports or commits):

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

- Store it only in that environment's environment file or process manager environment. `server/.env`, `server/.env.production` and `.env.local` are git-ignored; keep it that way.
- `server/.env.example` lists the variable with a deliberately invalid placeholder (`REPLACE_WITH_GENERATED_HEX_VALUE_NOT_A_REAL_KEY`), which the server refuses. It is documentation only.
- **Local development:** the server does not start until `OTP_HASH_SECRET` is added to `server/.env`. This was not done in this pass, because the environment file was not modified.
- **Rotation:** changing the value invalidates pending codes only (10-minute window). Plan rotation outside sign-in peaks; there is no other effect.
- **Loss:** losing the value invalidates pending codes; nothing else is affected.

Tests: `tests/otp-hmac.test.js` 13/13 (pure, per-run generated keys): digest format, case-insensitive email, binding to code/email/purpose, not an unkeyed SHA-256, different key gives different digest, constant-time helper, and refusal of missing, empty, short, non-hex, odd-length and placeholder-like values. The error text never contains the key.

### 8b.2 DEV schema inspection (REQUIRES DEV: not performed)

- **Access status:** no DEV host, user or password is available in this repository or environment. The only database settings present are SQLite for local development and production values (`server/.env.production`, git-ignored). Production was not used as a substitute, and no credentials were guessed.
- **Operator command (read-only).** Run from the repository root on a machine that can reach DEV, with a SELECT-only account:

  ```
  DB_CONNECTION=mysql DB_HOST=<dev-host> DB_PORT=3306 DB_NAME=<dev-db> \
  DB_USER=<select_only_user> DB_PASS=<password> \
  node server/scripts/schema-check-readonly.js
  ```

  The checker opens a READ ONLY session, reads `information_schema` and `@@GLOBAL.sql_mode`, and writes nothing. Its output includes the server version, whether strict mode is set, and each expectation with its column type and width.
- **Connection requirements:** MariaDB 10.11 reachable from the operator's machine (or an SSH tunnel to it); the account needs SELECT on `information_schema` for that database only; no write privileges. Do not use the production account.
- **What the result means:**
  - `verification_codes.code` reported as `varchar(10)`, with strict mode `yes`: **OTP sending fails on DEV** with `Data too long for column 'code'`. The migration in §8b.4 must be applied after review.
  - `varchar(10)` with strict mode `NO`: OTP sending **appears to succeed**, but every code is truncated and can never verify (proven in `tests/db/otp-service.db.test.js`). This is the worse case, and must be fixed first.
  - `varchar(64)` or wider: the OTP column is correct on DEV.
  - Reported missing: `ambassadors`, `ambassador_badge_history`, `contributors.approved_at`, `account_session_revocations` (created on first revocation), `file_ownership`, `file_ownership_audit`.
- **Reference result (not DEV):** a database built from the pre-widening dump (`cc13e2b`, `varchar(10)`), with the MariaDB 10.11.19 default strict mode, reports `TOO NARROW (varchar(10), need 64)` and seven expectations not met. The DEV result will differ only if DEV was altered.

### 8b.3 Legacy plaintext OTP rows (inspection prepared; counts REQUIRES DEV)

- **Target:** table `email_queue`. Selection rule (shared by inspection and purge, `server/scripts/legacy-otp-queue-select.js`): `blog_id IS NULL AND body LIKE '%Your verification code is:%'`. Only the retry queue (since removed) wrote this shape; blog notifications and membership mail do not match.
- **Inspection (SELECT-only, prints counts and metadata, never addresses, subjects, bodies or codes):**

  ```
  DB_CONNECTION=mysql DB_HOST=<dev-host> DB_PORT=3306 DB_NAME=<dev-db> \
  DB_USER=<select_only_user> DB_PASS=<password> \
  node server/scripts/inspect-legacy-otp-queue.js
  ```

  Reports: database and server, total rows, matching rows, counts by status, counts by age (under 10 minutes, 10 minutes to 1 day, over 1 day), `created_at` range, rows whose body still holds a six-digit code, rows with a known OTP subject, and the expected deletion count.
- **Counts for DEV and production: not available** (no access). No count is reported here. Production was not inspected.
- **Purge (prepared, NOT executed):** `server/scripts/purge-legacy-otp-queue.js`. Dry run by default and writes nothing. Applying requires all of:
  - `--backup=<file>`: an existing non-empty `mariadb-dump` of `email_queue`. The script checks that the file contains a dump of that table. **Sensitivity:** the backup itself contains the plaintext codes, so store it encrypted and delete it after the verification is signed off.
  - `--target=<db name>` equal to the connected database.
  - `--expected-count=<N>` equal to the matching count at apply time (refusal otherwise).
  - `--confirm=PURGE_LEGACY_OTP_ROWS`.
  It deletes in id batches, re-checks the selection rule on every `DELETE`, then verifies that no matching row remains and that the other rows are unchanged in count.
- **Procedure for DEV (requires separate approval):** (1) run the inspection and present the counts and the target name; (2) take `mariadb-dump --single-transaction <db> email_queue > <encrypted-location>`; (3) confirm the expected count; (4) run the purge with all guards; (5) run the inspection again and expect zero matching rows.
- **Verified on a disposable database** (`tests/db/legacy-otp-purge.db.test.js`, 6/6): inspection writes nothing and prints no sensitive values; dry run writes nothing; each refusal (no backup, empty backup, a dump of another table, wrong target, wrong count, missing phrase) is enforced; apply with a real dump deletes exactly the four legacy rows and keeps the other three (including a row that quotes the phrase but has a blog_id); the backup restores with the pre-purge row count; a repeat run deletes nothing.

### 8b.4 Column-width migration (prepared, NOT run)

`migrations/2026-11-05_widen_verification_codes.mysql.sql` widens `verification_codes.code` to `VARCHAR(64)`. Verified on a disposable MariaDB 10.11.19 database:

- Before the migration, a six-digit OTP is **rejected** in strict mode (`Data too long for column 'code'`), and **silently truncated** in non-strict mode.
- After the migration, applied twice without error, a six-digit OTP is inserted and its row holds a 64-character digest, and the full lifecycle works (verify, single use, wrong code, attempt limit, expiry, reset-password regression).

### 8b.5 Test results for this round

All commands with Node 22.23.2 on PATH.

| Command | Exit | Result |
|---|---|---|
| `cd server && npm test` | 0 | 17 suite summaries, 167 checks passed, 0 failed (includes `otp-hmac` 13/13 and `session-revocation` 12/12) |
| `TEST_DB_* npm run test:db` (MariaDB 10.11.19, disposable `sse_test_suite`) | 0 | 6 suites: auth-permissions 17/17, legacy-otp-purge 6/6, migrations 9/9, otp-delivery 3/3, otp-service 10/10, reset-atomic 4/4 — **49 checks, 0 failed, 0 skipped** |
| `npm run build` | 0 | Compiled successfully |
| `npx eslint` on every changed and new file | 0 | clean (two unused identifiers found and fixed during this round) |

Browser tests were **not** run in this round. The earlier browser results in §6 are unchanged and were not re-verified against the keyed hash.

### 8b.7 Follow-up OTP path and operations audit (2026-11-05)

This was a local, read-only code/configuration review. No `.env` file was changed, no DEV or production connection was attempted, and no migration or purge command was run.

**OTP path/configuration result:**

- `POST /api/send-otp` is the only code-generation endpoint. Signup (`type=signup`), password reset (`type=reset`) and member account deletion (`type=delete_account`) all call `OTPService.generateOTP`, which calls `otpKey()` before any insert and uses `hashOtp()` with the same call-time `process.env.OTP_HASH_SECRET` value.
- `POST /api/verify-otp` and the member deletion action both call `OTPService.verifyOTP`; verification hashes with the same email, purpose and call-time key. Signup completion checks the verified database state through `OTPService.isVerified` and does not implement a second hashing path.
- No alternative OTP generator, verifier, unkeyed OTP hash, background OTP worker or separate OTP API process was found. The email cron handles already-rendered queue messages; transactional OTP messages are deliberately not queued.
- Production PM2 runs one fork-mode process (`ecosystem.config.cjs` -> `start.cjs` -> `server/index.js`). `start.cjs` loads `server/.env`, and `server/index.js` validates `OTP_HASH_SECRET` before creating or exporting the Express application. A missing/invalid value exits with status 1; `OTPService.generateOTP` and `verifyOTP` also validate at call time. There is no fallback or default key.
- PM2 does **not** define `OTP_HASH_SECRET` in `env_production`; it must therefore be present in `server/.env` or injected into the PM2 environment. After setting/changing it, the operator must reload the one intended process with `--update-env` if PM2 environment injection is used. Every web/API instance in one environment must receive the identical value. Local, DEV and production values must differ.
- `server/package.json` contains a stale `cron` command for missing `server/cron.js`. It is not part of the PM2 production configuration and no separate worker currently needs the OTP secret. Do not create or start a second process from that command as part of this remediation.
- Startup validation occurs when `server/index.js` is required. In the unified production entry point, Next.js preparation happens before that require, so a bad key still prevents the HTTP listener from starting but only after Next preparation. This is fail-closed, though not the earliest possible validation point.

**Read-only tooling result:**

- `schema-check-readonly.js` sets the MariaDB session to `TRANSACTION READ ONLY` before querying `DATABASE()`, server/sql-mode metadata and `information_schema`. It contains no DDL/DML statement.
- `inspect-legacy-otp-queue.js` likewise sets the session read-only before querying. It prints only database/server identity, aggregate counts, age/status groups and a date range; it does not select or print recipient, subject, body, code or row ID.
- Use a DEV account with SELECT-only grants even though the scripts request read-only sessions. This provides an independent database-side control.

**Guarded purge review — NOT approved and not ready to execute:**

- The selection is narrow and shared with inspection: `blog_id IS NULL AND body LIKE '%Your verification code is:%'`. Deletes re-check the predicate by ID; count and confirmation guards exist; disposable-MariaDB tests show unrelated rows are retained.
- The current wrong-target guard is not sufficient to claim that an accidental wrong-database purge is impossible. `--target` is compared only with `SELECT DATABASE()`; an operator connected to the wrong host/database can copy that displayed name into the option. The script does not require an approved host fingerprint, environment marker or inspection artifact.
- The backup check proves only that a non-empty file contains `CREATE TABLE email_queue` in its first 200 KB. It does not prove encryption, that row data is present, that it came from the connected database, or that it restores successfully.
- Therefore keep the purge on hold. Before any later execution, add and test an independent environment identity guard (approved DEV host plus immutable environment marker), bind the approved inspection result/count to the run, and require a successfully restored encrypted backup. A separate deletion decision remains mandatory.

**Backup confidentiality requirement:**

- Legacy queue dumps contain plaintext OTPs and must never be written to the repository, pasted into chat/tickets/reports, or included in terminal/log capture. The report may contain aggregate counts only.
- Store the dump only in an encrypted, access-controlled location. Prefer streaming directly into an approved encryption tool so no plaintext dump exists on disk; verify decryption and restore into an isolated scratch database, record only the verification result/counts, then apply the organization's retention/deletion policy. Exact encryption/key-custody commands must be supplied by the environment owner because no approved tool or recipient key is identified in this repository.

**`VARCHAR(64)` migration review:**

- The forward statement changes only `verification_codes.code` to `VARCHAR(64) NOT NULL`, which is the required width for SHA-256 hex digests. Run it only if DEV inspection reports a width below 64 and only after the migration/backup decision is approved.
- MariaDB `ALTER TABLE` causes an implicit commit and may rebuild/lock the table; this is not an application-level transactional migration. Calling the statement "idempotent" means the desired schema result is repeatable, not that a repeat is operationally free.
- The documented rollback is destructive: it first deletes every row longer than 10 characters, including all HMAC OTP rows, then narrows the column. It cannot preserve outstanding OTPs and is not a true data rollback. The normal recovery is to restore the pre-migration database backup or leave the wider compatible column in place; narrowing should be an exceptional, separately approved action.

**Exact prerequisites and commands once DEV read-only access exists:**

1. Obtain the approved DEV hostname/database name and a DEV-only SELECT account. Confirm independently that the target is DEV; do not infer it from script output and do not substitute production.
2. In a terminal excluded from screen/log capture, export the DEV connection variables (do not put credentials in shell history or this report), then run:

   ```sh
   node server/scripts/schema-check-readonly.js
   node server/scripts/inspect-legacy-otp-queue.js
   ```

   Required variables are `DB_CONNECTION=mysql`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` and `DB_PASS`. Review the database/server identity, `verification_codes.code` width, SQL strict mode, total queue count, matching count and known-subject count. Do not run the purge.
3. If and only if the width is below 64, review the execution window, database backup/restore proof and DDL locking risk, then seek separate migration approval for `migrations/2026-11-05_widen_verification_codes.mysql.sql`. No migration command is authorized by this report.
4. Present only aggregate legacy-row counts and the encrypted-backup/restore procedure for a separate purge decision. The current purge script must receive the additional wrong-environment controls above before it is eligible for approval.

**Precise DEV browser checklist (MOCK mail, after schema/key readiness and before deployment approval):**

1. Confirm the DEV web/API process starts with the DEV-only secret and MOCK mail, and that logs show neither secret, OTP, digest nor email body. Confirm a deliberately missing secret in a controlled process launch exits non-zero and opens no listener.
2. Signup: request a code for a new address; retrieve it only from the approved MOCK mail viewer; verify it; complete signup; confirm the same code cannot be verified again.
3. Password reset: request and verify a reset code for an existing account; set a new password; confirm the reset completes once and the verified authorization cannot be reused.
4. Invalid code: submit a wrong six-digit value and confirm a generic invalid-code response without leakage in browser or server logs.
5. Attempt limit: submit five wrong values for one fresh code, then submit the correct value and confirm it is refused as locked. Request a new code before continuing to avoid the hourly send limit.
6. Expiry: with an isolated test row/clock procedure approved for DEV, allow or arrange expiry beyond 10 minutes and confirm the correct code is refused as expired.
7. Single use/concurrency: submit the same valid code twice (including near-concurrent submissions if the test harness supports it); exactly one verification may succeed.
8. Cross-binding: confirm a code issued for one email or purpose cannot verify another email/purpose. Include signup versus reset.
9. Delivery failure: force MOCK delivery failure, confirm the API does not expose account existence, and confirm no OTP-bearing `email_queue` row is created.
10. Capture pass/fail evidence without OTP values, secrets, digests, message bodies or live personal addresses. Production deployment remains unapproved regardless of DEV results.

### 8b.6 Blockers before DEV can accept OTP changes

1. Operator must run `schema-check-readonly.js` on DEV and report its output (§8b.2).
2. `OTP_HASH_SECRET` must be generated and set for DEV and production by the operator. Neither was set in this pass; the server refuses to start without it.
3. Legacy row inspection on DEV and production (§8b.3). Purge needs separate approval after the counts and target are presented.
4. Column-width migration (§8b.4) after review, if the DEV check shows `varchar(10)`.
5. Browser verification of the OTP flows (signup and password-reset codes) on DEV with MOCK mail.
6. Remaining from earlier rounds: membership checkout and webhook, uploads and file ownership in a browser, contributor and ambassador login flows, and the NOT DONE items in §6.

## 9. Lint

- ESLint config now ignores generated and vendored output: `.next`, `out`, `coverage`, `node_modules`, `server/node_modules`, `public/**`. `process` is a readonly global for browser code (Next.js inlines `process.env`).
- Before the config change: 1,786 errors (most from `.next`). After: **110 errors, 13 warnings, in 64 files** (src 96 findings, server 27).
- Defects fixed (runtime or security relevant):
  - `server/controllers/admin/profileController.js`: `cleanWebUrl` not imported (every admin profile save threw). Fixed; `tests/admin-profile-url.test.js`.
  - `src/components/Header.jsx`: "Change Password" called an undefined setter. Now opens the profile modal that contains the password form.
  - `src/components/ShareButton.jsx`: `addToast` not imported. Fixed.
  - `src/components/admin/AdminHome.jsx`: hooks called after an early return. React rejects a changed hook count between renders. Early return moved after all hooks.
  - `server/repositories/admin/ambassadorsRepository.js`: two functions defined twice; the later definitions were silently in effect. Removed the shadowed earlier pair. The controller's "preserved as member" behaviour is unchanged.
- Remaining debt (not fixed, to avoid unrelated rewrites):
  - `no-unused-vars` 48, `no-empty` 26 (empty catch blocks; some are intentional best-effort cleanup), `react-refresh/only-export-components` 14, `react-hooks/set-state-in-effect` 14, `react-hooks/exhaustive-deps` 12, `no-useless-escape` 4, `no-control-regex` 1 (`pdfWatermark.js`, intentional control-character stripping), `react-hooks/preserve-manual-memoization` 1, `null` 3 (rule name reported by ESLint, to investigate).

## 10. Node runtime

### Local Mac

- **System Node is broken.** `/opt/homebrew/bin/node` (Node 24.5.0) aborts because `libsimdjson.26` is missing. Cause: `brew install mariadb@10.11` upgraded simdjson and removed the old library. A symlink to the 5.x library was tried, made the repo's scripts crash, and was removed. Nothing system-wide was changed in this pass.
- To restore: either build simdjson 3.13.0 from source (downloads source), or reinstall Node (moves to 26.x, which the rules forbid without approval). Needs your decision.
- All tests and builds in this pass used Node 22.23.2 from nvm.
- Native module `better-sqlite3` loads under Node 22 (checked).

### Dependency requirements (from installed packages)

- Server: `better-sqlite3@13` requires Node ≥22; `server/package.json` engines `>=22`.
- Root: `react-router` 7 requires ≥20; `vite` 6 ≥22 for some builds; `@vitejs/plugin-react` ^20.19 or ≥22.12; `next` 15 ≥18.18.
- Conclusion: **Node 18 cannot run this codebase.** Not tested on Node 18 (not installed, not installed in this pass).

### DEV runtime recommendation: Node 22 for DEV only (REQUIRES DEV, not applied)

Run on the **Lightsail host** over SSH, as the deploy user (not root), and never change the system Node:

1. Record the current DEV PM2 state (backup for rollback):
   `pm2 jlist > ~/pm2-dev-backup-$(date +%F).json`
2. Install nvm for the deploy user and Node 22 into the user's home (not system-wide):
   `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash` (downloads a script: confirm first), then
   `nvm install 22.23.2 && nvm use 22.23.2`
   Node path: `$HOME/.nvm/versions/node/v22.23.2/bin/node`
3. In the DEV checkout, install with the Node 22 toolchain:
   `$HOME/.nvm/versions/node/v22.23.2/bin/node $(which npm) ci --prefix server` and `… ci` at the root (or `npm install` where `ci` needs a lockfile that matches). Run `npm rebuild better-sqlite3` if the server loads SQLite (DEV uses MariaDB, so this is optional).
4. Build with Node 22: `$HOME/.nvm/versions/node/v22.23.2/bin/node $(which npm) run build`
5. Restart **only the DEV app**, with an explicit interpreter:
   `pm2 restart <dev-app-name> --interpreter $HOME/.nvm/versions/node/v22.23.2/bin/node --update-env`
   Confirm: `pm2 describe <dev-app-name> | grep interpreter`
6. Production is not touched: do not run `pm2 restart all` or `pm2 reload ecosystem.config.cjs --env production`. Production keeps its own interpreter (Node 18.20.4 in its config).

Rollback (DEV only): `pm2 restart <dev-app-name> --interpreter /usr/bin/node --update-env` (or the previous interpreter recorded in the PM2 backup). Remove the nvm Node afterwards if it is no longer needed.

Where the Mac commands run: steps 2–5 in the Lightsail SSH session; the Mac runs only the local test commands in this report.

The repo has no DEV PM2 entry; `ecosystem.config.cjs` has only a production environment. The DEV PM2 configuration is therefore outside the repo, and it must be preserved as it is.

## 11. Test and build results

All commands run with Node 22.23.2 on PATH. The table below is the first pass; the round 2 totals are in §8a and supersede it.

| Command | Exit | Result |
|---|---|---|
| `cd server && npm test` | 0 | 16 suite summaries, 0 failed. Suites: currency, payments, membership, content-security, frontend-safety, external-isolation, session-revocation, remediation, file-ownership, download-transport, session-csrf, permission-matrix, migration-prep, reset-link, admin-profile-url, admin-preview-sanitise. |
| `TEST_DB_* npm run test:db` (MariaDB 10.11.19, `sse_test_suite`) | 0 | `auth-permissions.db`: 17 passed, 0 failed. `migrations.db`: 9 passed, 0 failed. |
| `npm run build` (Next.js production) | 0 | Compiled successfully. Prerender logs `ECONNREFUSED 127.0.0.1:3001` because the API is not running during build (pre-existing; affects static prerender output). |
| `npx eslint .` | 1 | 110 errors, 13 warnings, 64 files. Exit 1 is expected while the debt in §9 remains. |
| TypeScript | n/a | No TypeScript or `tsconfig`/`jsconfig` in the repo (0 `.ts`/`.tsx` files). |
| Browser (local, §6) | n/a | 9 passed, 6 not done. |

Skipped: the DB suites are skipped (not passed) when `TEST_DB_HOST`/`TEST_DB_NAME` are not set; the runner prints `SKIPPED` and exits 0 in that case. A skip is never reported as a pass.

## 12. Commits (local, not pushed)

Recorded in the git log after the commits for this pass (see the summary in the reply).

## 13. Remaining risks

1. System Node on the Mac is broken (§10). Blocks local `node` and `npm` outside nvm.
2. Reset-token transaction: fixed in round 2 (R1).
3. OTP codes: no longer queued (R2). Old plaintext rows in `email_queue` may still exist on DEV and production (§13 item 10).
4. DEV schema drift: `schema.sql` has no `ambassadors` table (created at startup by `ensureMySQLTables`), and `contributors.approved_at` is missing in the dump (`backfillContributorApprovedAt` fails non-fatally). Check DEV before the migration.
5. Membership checkout, webhook, uploads, file ownership UI, comments, FAQ, announcements, news, learnings, contributor and ambassador browser flows are not verified in a browser (§6).
6. Staff role and deactivation changes take up to 15 s to apply (cache, §7).
7. Lint debt (§9); none of it is security-critical after the fixes above, but `no-empty` catch blocks can hide errors.
8. The Mac's data volume filled up during this pass (about 199 MB free, then recovered on its own). Database writes and builds failed during that period; the results above were produced after space recovered.
9. Earlier test runs (before this pass) loaded `server/database.sqlite`, the local development database, through `db.js`. That file is git-ignored, and the tests now stub `db.js`. Check the local file if it matters to you. Nothing on DEV or production was touched.
10. Plaintext OTP rows may remain in `email_queue` from before round 2 on DEV and production (R2).
11. `verification_codes.code` may be too narrow on DEV and production (R7). Confirm with the DEV schema check (§8b.2). The keyed-hash change (R6) is implemented; DEV needs `OTP_HASH_SECRET` before OTP sending works.


## 14. DEV deployment prerequisites (checklist)

- [ ] Node 22.23.2 installed for the DEV deploy user (not system-wide), per §10.
- [ ] DEV PM2 state backed up (`pm2 jlist`).
- [ ] Read-only inventory run on DEV with a SELECT-only account; counts reviewed (§5).
- [ ] Full MariaDB dump of DEV taken; restore verified into a scratch database.
- [ ] Ownership audit table exported before any rollback (§4).
- [ ] Schema drift checked: run `scripts/schema-check-readonly.js` on DEV (SELECT only) and compare with §8a (`ambassadors`, `contributors.approved_at`, `verification_codes.code` width).
- [ ] `verification_codes.code` widened to VARCHAR(64) after review of `migrations/2026-11-05_widen_verification_codes.mysql.sql` (R7). Confirm first whether OTP sending currently fails on DEV.
- [ ] Existing `email_queue` rows reviewed with `server/scripts/inspect-legacy-otp-queue.js` (aggregate output only). Purge remains on hold pending the additional wrong-environment guards, encrypted backup/restore proof, exact-row review and separate approval (§8b.7).
- [x] OTP hash keyed with `OTP_HASH_SECRET` (R6): implemented; the operator must generate and set the value for DEV (§8b.1).
- [ ] `OTP_HASH_SECRET` set for DEV and, separately, for production (generated on the host, never pasted into chat or Git).
- [ ] MANUAL URL values and `needs_review` ownership rows decided by an admin (§4).
- [ ] Nginx: apply the recommended map and `error_log` change on DEV only after review; validate with `nginx -t`.
- [ ] Reset flow: legacy `?token=` branch removed 60 minutes after deployment.
- [ ] Migration dry runs on DEV, then a separate explicit approval before any `--apply`.
- [ ] Browser checks in §6 marked NOT DONE repeated on DEV with MOCK mail and Razorpay test mode.

## 15. Production safety confirmation

- No production file, server, database, PM2 process, Nginx configuration, DNS, SSL, credential or secret was changed or read in this pass.
- No migration was run against DEV or production.
- No real email was sent. Mail mode was `MOCK` (explicit environment variable), confirmed in the startup log.
- No Zoho invoice was created. Zoho mode was `MOCK` (explicit).
- No Razorpay payment was initiated. The browser flows did not reach checkout.
- Nothing was pushed.
- `.env` files were read only to find variable names. No secret value was printed. One public Razorpay key-ID prefix (`rzp_test_…`) was printed during the search.
