# DEV database remediation and configuration preparation

Status: prepared locally on 2026-11-10. Nothing in this document has been executed against DEV or production.

## 1. Read-only DEV email queue evidence

Database: `sap_security_expert_dev`, MariaDB `10.11.19`, strict SQL mode, utf8mb4 client/connection charset.

| Aggregate | Observed |
|---|---:|
| Total rows | 2 |
| NULL recipient / subject / body / blog_id | 0 / 0 / 0 / 0 |
| Maximum subject characters | 55 |
| Maximum body characters | 3,565 |
| Maximum blog_id characters | 31 |
| Values over subject 500 / blog_id 255 | 0 / 0 |
| Duplicate non-NULL recipient/blog_id groups | 0 |
| Duplicate non-NULL excess rows | 0 |

The table is `latin1_swedish_ci`; all other inspected application tables use utf8mb4. Its current structure is `subject VARCHAR(255) NOT NULL`, `body TEXT NOT NULL`, nullable `blog_id VARCHAR(255)`, and primary key only. It has no recipient/blog uniqueness constraint.

The current creation SQL expects utf8mb4, `subject VARCHAR(500)`, `body LONGTEXT`, and a unique recipient/blog key. It does not require narrowing `blog_id`; the existing 255-character nullable type is retained in the v2 proposal as the safe compatible superset.

### Charset risk

Converting a correctly decoded latin1 value to utf8mb4 is representationally safe: latin1 code points are preserved. Aggregate inspection cannot determine whether historic UTF-8 bytes were previously misdecoded as latin1 (mojibake). Do not attempt heuristic content repair in DDL. The verified backup is the rollback path.

### Duplicate risk

The preflight count is zero today. That is not an authorization to delete anything and is not durable: inserts may occur before execution. The v2 script repeats the aggregate duplicate gate. Its `ADD UNIQUE KEY` is intentionally separate; if a concurrent duplicate appears it fails, preserving rows rather than merging or deleting them.

## 2. Revised migration proposal

Use the two ordered files only after explicit approval:

1. [Stage 1: conversion and widening](../server/migrations/2026-11-10_email_queue_utf8mb4_v2.mysql.sql)
2. [Stage 2: target-collation uniqueness](../server/migrations/2026-11-10_email_queue_utf8mb4_v2_add_unique.mysql.sql)

The earlier charset-only file remains in Git and is marked superseded. V2:

1. Runs aggregate-only width/null gates.
2. Converts all text columns to `utf8mb4_unicode_ci`.
3. Preserves current non-null semantics and defaults.
4. Widens subject to 500 and body to LONGTEXT without truncation.
5. Retains nullable `blog_id VARCHAR(255)`; it does not narrow data.
6. Stops at an information_schema hand-off because MariaDB DDL commits independently.
7. Rechecks duplicates under the **target** `utf8mb4_unicode_ci` collation in stage 2, immediately before adding `uq_email_queue_recipient_blog`.
8. Uses the unique-index ALTER as a database-enforced race check: a new duplicate fails safely and changes no queue rows.
9. Provides post-DDL information_schema checks and explicit partial-completion recovery instructions.

Local fixture result: stage 1 and stage 2 passed on a fresh disposable MySQL 9.6 database, including Telugu/emoji insertion after conversion. A separate disposable fixture demonstrated that `Strasse`/`Straße` are distinct enough for the legacy fixture but collide under `utf8mb4_unicode_ci`; stage 2 reported one aggregate collision group and was not applied. Both fixtures were dropped afterward. This is syntax/effect evidence only; approval requires a MariaDB 10.11 restore rehearsal.

### MariaDB 10.11 validation plan

Do not create a local database/server until separately approved. When a disposable MariaDB `10.11.19` or compatible `10.11.x` instance is available, execute this matrix only against an `sse_test_*` fixture:

| Fixture case | Expected result |
|---|---|
| Existing latin1 queue rows | Stage 1 preserves row count, nullability/defaults and data bytes while producing utf8mb4 columns |
| Telugu and emoji inserted after stage 1 | Round-trip values preserve bytes and characters under utf8mb4 |
| Nullable `blog_id` rows | Multiple NULL blog IDs remain permitted after stage 2 |
| Target-collation collision | Stage 2 aggregate reports a duplicate group; unique ALTER is not approved/executed |
| Duplicate inserted after stage-2 query | Unique ALTER fails without deleting/merging rows; stage 1 remains verifiable |
| Existing queue rows | Subject/body widening and conversion preserve row count and values |
| Application queue tests | Membership idempotency, blog notification claim/rollback, retry/attempt handling and mock mail remain passing |

For a deliberate stage-2 failure test, preserve the fixture, inspect only aggregate counts and information_schema, then discard the disposable fixture. The recovery decision must distinguish “stage 1 complete, stage 2 absent” from “restore verified backup”; neither case permits in-place cleanup of live queue records.

## 3. Encrypted backup and restore rehearsal

The existing DEV dump `/home/admin/db-backups/sap_security_expert_dev-20261106T071158Z.sql` is plaintext. A similarly named checksum file exists, but neither checksum verification nor restore was performed. Older plaintext dumps include mode-0644 files. No encrypted DEV database dump was found.

Before any migration, an approved operator should use a protected credentials file and an approved GPG public recipient:

```bash
umask 077
backup_root=/var/backups/sap-security-expert/dev
stamp=$(date -u +%Y%m%dT%H%M%SZ)
encrypted_dump="$backup_root/dev-$stamp.sql.gz.gpg"

# Requires an existing owner-only backup directory and credentials file.
mariadb-dump --defaults-extra-file=/secure/path/dev-backup.cnf \
  --single-transaction --routines --triggers --events --hex-blob \
  --default-character-set=utf8mb4 --skip-lock-tables sap_security_expert_dev \
| gzip -9 \
| gpg --batch --encrypt --recipient-file /secure/path/dev-backup-recipient.asc \
    --output "$encrypted_dump"

sha256sum "$encrypted_dump" > "$encrypted_dump.sha256"
sha256sum --check "$encrypted_dump.sha256"
gpg --batch --decrypt "$encrypted_dump" | gzip -t
```

Restore only into an isolated `sse_restore_*` database after an explicit name guard:

```bash
restore_db=sse_restore_YYYYMMDD_HHMMSS
case "$restore_db" in sse_restore_*) ;; *) exit 2;; esac

mariadb --defaults-extra-file=/secure/path/dev-restore.cnf \
  -e "CREATE DATABASE \`$restore_db\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
gpg --batch --decrypt "$encrypted_dump" | gzip -dc \
  | mariadb --defaults-extra-file=/secure/path/dev-restore.cnf "$restore_db"
```

Compare source and restore before approving migration:

- Exact `COUNT(*)` per table, not `information_schema.TABLE_ROWS` estimates.
- `information_schema.COLUMNS`, `STATISTICS`, `KEY_COLUMN_USAGE`, and `REFERENTIAL_CONSTRAINTS`.
- Routines, triggers, and events.
- Dump/checksum timestamps, operator and restore result.

Rollback is restore of this verified encrypted backup. Do not convert queue text back to latin1 or narrow columns in place.

### Old plaintext dumps

Do not delete, chmod, move, or open them during preparation. Inventory them under an approved incident/data-retention decision; then encrypt and move to controlled storage, retain a checksum/audit record, and securely remove plaintext copies only after restore verification and retention approval. Mode-0644 dumps require priority handling because they are broadly readable by local accounts.

## 4. Persistent DEV noindex proposal

The live response has `X-Robots-Tag`, but `ROBOTS_NOINDEX` is absent from both PM2 and `server/.env`. The source is `next.config.js`: `headers()` is evaluated at **build time**. The current header therefore likely comes from an earlier temporary build environment and is not durable.

Proposed durable defense in depth:

1. Store non-secret DEV build settings in a protected, DEV-only file outside Git, modelled by [dev-build.env.example](../deploy/dev-build.env.example).
2. Source that file before every DEV `npm run build` so `ROBOTS_NOINDEX=true` is present at Next build time.
3. Put the same non-secret indicator in the DEV-only PM2 ecosystem definition for observability.
4. Add the DEV-only Nginx header proposal below, hiding any upstream X-Robots header first so exactly one header is delivered.

Approval-time verification:

```bash
curl -sSI https://dev.sapsecurityexpert.com/ | grep -i '^x-robots-tag:'
curl -sSI https://dev.sapsecurityexpert.com/robots.txt
```

Do not use the DEV build file or Nginx stanza on production.

## 5. Nginx safe-cache proposal

[nginx.dev-secure-proposed.conf](../deploy/nginx.dev-secure-proposed.conf) is an inactive **merge template**, not a directly installable replacement. It lists the active-vhost TLS, timeout, log and security directives that an approved operator must carry over. It corrects the active configuration by:

- Removing the 120-second shared HTML cache and its `proxy_ignore_headers Cache-Control` override.
- Eliminating the ambiguous `$cookie_connect_sid` bypass for the `connect.sid` cookie.
- Explicitly disabling proxy caching for API, admin, member, uploads, downloads, and public HTML.
- Keeping browser-only immutable caching for `/_next/static/` and bounded caching for `/assets/`.
- Preserving application CSP/HSTS/nosniff/frame/referrer headers and explicitly emitting exactly one DEV-only noindex header in every location class.

Approval-time test matrix:

| Request | Expected |
|---|---|
| Anonymous `/` twice | `Cache-Control: no-store`; never shared-cache HIT |
| Authenticated public page | `Cache-Control: no-store`; no content from another session |
| `/api/*`, `/admin/*`, `/member/*` | No-store, no cache HIT |
| `/uploads/downloads/*` | Application-gated and no-store |
| Hashed `/_next/static/*` | Browser immutable cache only |
| `/` and protected routes | One `X-Robots-Tag: noindex, nofollow, noarchive` |
| HTTP redirect, `/_next/static/*`, `/assets/*` | One `X-Robots-Tag: noindex, nofollow, noarchive` |

Back up the exact active vhost, run `sudo nginx -t`, reload DEV only, and retest after explicit approval. None of these commands has run.

## 6. Disposable MariaDB test isolation

The existing harness refuses non-loopback hosts and database names not matching `sse_test_[a-z0-9_]+`. It therefore cannot be pointed at `sap_security_expert_dev` or a production database by its own configuration parser.

```text
Allowed host values: 127.0.0.1, localhost, ::1
Required database prefix: sse_test_
```

The current harness drops and creates its database. Do not grant a general production-capable account to it. Safer options, requiring approval, are:

1. A separate local MariaDB instance/container dedicated to test databases; or
2. A pre-created single `sse_test_*` database plus a harness enhancement that recreates tables inside that database rather than dropping/creating databases.

Only then create a dedicated account scoped to that test database with the minimal table DDL/DML privileges required by the harness. Do not use DEV application credentials. Test coverage must include authentication, sessions/revocation, membership, ownership, mocked payments, queue behavior, download entitlements, and Telugu/emoji round trips.

## 7. Low-memory DEV deployment plan

Prerequisites: approved encrypted/verified backup, reviewed queue migration decision, noindex source, Nginx decision, Git push approval, and a recorded PM2 ID 1 rollback state. Do not use `git reset`, `git clean`, or an operation that removes untracked `ecosystem.dev.config.cjs` or private downloads.

1. Record branch/HEAD, `pm2 describe 1`, RAM/swap/disk, and health response.
2. Confirm the working tree has only known untracked runtime files.
3. Fast-forward only the DEV branch; do not clean the checkout.
4. Run one build at a time. Stop if available memory/swap deteriorates materially; do not run backfill, database tests, or concurrent package work.
5. Restart **PM2 ID 1 only** after explicit approval.
6. Immediately check `pm2 describe 1`, `curl /api/health`, noindex header, logs, RAM and swap.
7. Run no migration unless separately approved.

Rollback: return the DEV checkout to the recorded pre-deploy commit by an approved, non-destructive Git operation, restore the recorded PM2 ID 1 configuration, restart ID 1 only, then repeat health/header/log checks. Database rollback is restore from the verified encrypted backup only when a database migration was separately approved.
