# SAP Security Expert: DEV Operator Handover

Written for: the operator who has SSH access to the DEV host and a SELECT-only database account on the DEV MariaDB.

Status of this handover: **prepared, not executed.** Nothing in this document has been run against DEV or production. Every command below was tested only on a disposable MariaDB 10.11.19 database, as recorded in `docs/SECURITY_REMEDIATION_FINAL_REPORT.md`.

## 0. Frozen code baseline

| Item | Value |
|---|---|
| Repository | `/Users/webanatomy/Desktop/sap-security-expert-new` (developer workstation) |
| Branch | `main` |
| Commit to deploy to DEV | `d015312b9d435e09c93d85e984d7fbe65ad6cc55` (or the later commit that adds this handover, if approved) |
| Upstream | `origin/main`, **20 commits ahead, not pushed** |
| Working tree | Clean at the time of writing |

Do not deploy anything, and do not pull a different commit, unless the owner approves that specific commit.

## 1. Gates: what needs an explicit approval

| Gate | Action | Who approves | Status |
|---|---|---|---|
| G0 | Read-only checks (sections 3 and 4) | Operator (no writes) | Ready to run when access exists |
| G1 | Push `main` to `origin` | Owner | **Not approved** |
| G2 | Deploy frozen commit to DEV | Owner | **Not approved** |
| G3 | Set `OTP_HASH_SECRET` on DEV | Owner | **Not approved** |
| G4 | Node 22 switch and PM2 restart on DEV | Owner | **Not approved** |
| G5 | Apply column widening (`verification_codes.code`) on DEV | Owner, after schema check and full dump | **Not approved** |
| G6 | Legacy OTP purge on DEV | Owner, **blocked** (see section 9) | **Blocked** |
| G7 | Any migration script (`migrate-*.js`) on DEV | Owner, separate review | **Not approved** |
| G8 | Anything on production | Separate deployment decision | **Out of scope** |

## 2. DEV-only prerequisites

### 2.1 Access

- SSH to the DEV host as the deploy user, not root. The deploy user must own the DEV checkout and the PM2 process.
- A **SELECT-only** database account for the DEV database, for inspection only. It needs SELECT on the DEV database and nothing else. It must not be the application account and must not be the production account.
- Verify the grants before running anything:

  ```
  SHOW GRANTS FOR CURRENT_USER();
  ```

  The output must show `SELECT` and no `INSERT`, `UPDATE`, `DELETE`, `ALTER`, `DROP`, `CREATE`, `GRANT OPTION` or `ALL PRIVILEGES`. If it does, stop and report it.
- Network: MariaDB 10.11 must be reachable from where the commands run. Either run from the DEV host itself, or use an SSH tunnel to the database port. Do not open the database port publicly.
- The DEV database name, host and user are not in this repository. The operator supplies them. Nothing here is a default.

### 2.2 Node and PM2

- Node 22 is required. The server package declares `"node": ">=22"`. The root package declares `>=18.18.0`, which is not sufficient for the server. The DEV runtime has previously been Node 18.20.4.
- Install Node 22 for the deploy user only, through nvm. Do not change the system Node.
- The PM2 app is named `sap-security-expert` in `ecosystem.config.cjs`, which defines only `env_production`. **The DEV PM2 process is defined outside this repository.** Confirm its name and current interpreter with `pm2 list` and `pm2 describe <name>` before changing anything.
- The log directory `logs/` must exist and be writable before PM2 starts the app.

### 2.3 The DEV environment file

- The DEV environment file lives on the DEV host (for example `server/.env`). It is git-ignored. Do not copy it into the repository, and do not paste its contents into chat, tickets or reports.
- Before any change, take an encrypted copy of the current file as a rollback point.

## 3. Read-only schema inspection

### 3.1 Command

Run from the repository root, using Node 22. Set every database variable explicitly on the command line. `dotenv` does not overwrite variables that are already set, so explicit values take precedence over any file. This prevents a copy of the wrong environment file from selecting the wrong database.

```
DB_CONNECTION=mysql \
DB_HOST=<dev-db-host> \
DB_PORT=3306 \
DB_NAME=<dev-db-name> \
DB_USER=<select-only-user> \
DB_PASS=<select-only-password> \
$HOME/.nvm/versions/node/v22.23.2/bin/node server/scripts/schema-check-readonly.js
```

Notes:

- The script opens a `READ ONLY` session and reads only `information_schema` and `@@GLOBAL.sql_mode`. It writes nothing.
- It needs `mysql2` and `dotenv` from `server/node_modules`. If they are missing, run `npm ci --prefix server` under Node 22 on a checkout. That writes only `node_modules`, not the database. Running from the operator's workstation at the same commit avoids touching the DEV host.
- Use the password only from an environment variable or a prompt. Do not put it on a command line that is saved to shell history. If your shell records history, prefix the command with a space or clear the history afterward.

### 3.2 Manual cross-check (SELECT only, optional)

```
SELECT @@GLOBAL.sql_mode, @@SESSION.sql_mode, VERSION();

SELECT CHARACTER_MAXIMUM_LENGTH
  FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME = 'verification_codes' AND COLUMN_NAME = 'code';

SELECT TABLE_NAME
  FROM information_schema.TABLES
 WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME IN ('ambassadors', 'ambassador_badge_history',
                      'account_session_revocations', 'file_ownership', 'file_ownership_audit');

SELECT COUNT(*) FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'contributors' AND COLUMN_NAME = 'approved_at';
```

Expected lengths and tables are described in section 5.

## 4. Aggregate-only OTP queue inspection

### 4.1 Command

Same environment variables as section 3.1, with the other script:

```
DB_CONNECTION=mysql DB_HOST=<dev-db-host> DB_PORT=3306 DB_NAME=<dev-db-name> \
DB_USER=<select-only-user> DB_PASS=<select-only-password> \
$HOME/.nvm/versions/node/v22.23.2/bin/node server/scripts/inspect-legacy-otp-queue.js
```

What it does:

- Runs in a `READ ONLY` session. It only selects counts and aggregates.
- Prints: database name, server version, total `email_queue` rows, matching legacy rows, counts by status, counts by age band, the `created_at` range of matching rows, the count of matching rows whose body still holds a six-digit code, the count with a known OTP subject, and the number of rows a purge would delete.
- Does **not** print recipient addresses, subjects, message bodies or codes. The `created_at` range is a timestamp only.

Limitation: the selection rule matches the body phrase `Your verification code is:` with `blog_id IS NULL`. A legacy OTP row written with different wording would not be counted. The operator should report that possibility rather than assume the count is complete.

### 4.2 Output to return to the owner

Return the printed output as text. It contains no personal data. Do not return screenshots of the queue, and do not run ad-hoc `SELECT *` queries against `email_queue` to "check".

## 5. Required output and how to read it

### 5.1 Schema output

| Printed line | Meaning | Action |
|---|---|---|
| `sql_mode: ... strict: yes` | Over-long values are rejected | Continue |
| `sql_mode: ... strict: NO` | Over-long values are **silently truncated** | **Stop. Report.** OTP codes will never verify |
| `verification_codes.code  present (varchar(64))` | Column is correct | No action for this item |
| `TOO NARROW (varchar(10), need 64)` with strict yes | OTP sending **fails on DEV** (`Data too long`) | Needs gate G5 after a full dump |
| `MISSING TABLE ambassadors` / `ambassador_badge_history` | Created at startup by `db.js` on MySQL, absent from `schema.sql` | Drift: report. Do not migrate |
| `MISSING COLUMN contributors.approved_at` | Absent. A startup backfill fails quietly | Drift: report |
| `MISSING TABLE account_session_revocations` | Created on first session revocation | Normal on a database that has never revoked a session. Report it either way |
| `MISSING TABLE file_ownership` / `file_ownership_audit` | Ownership migration not applied | Report. Gate G7 |

The final line is `N expectations, M not met`. Report all lines, not only the total.

### 5.2 Queue output

| Printed line | Meaning | Action |
|---|---|---|
| `legacy OTP rows (selection rule): 0` | Nothing to purge under this rule | Report. Purge is not applicable |
| `legacy OTP rows (selection rule): N` with N > 0 | Plaintext codes may exist | Report the full output. Purge stays **blocked** |
| `by age: under 10 minutes ...` > 0 | Some codes may still be valid | Report. Do not purge as part of any cleanup |
| `rows whose body still holds a six-digit code: N` | Plaintext codes confirmed in bodies (values not shown) | Report |
| `rows the purge would delete: N` | Expected deletion count if approved later | Report. Not an instruction to delete |

## 6. OTP_HASH_SECRET

### 6.1 Requirements

- Required by the server in every environment. The server refuses to start without it, and OTP requests refuse to create codes without it.
- Must be a hex string encoding **at least 32 random bytes** (64 or more hex characters). Odd length, non-hex, short or empty values are refused.
- Must be different on DEV and production. Never reuse a value between environments.
- Must be the same on every application instance that verifies codes. Today there is one instance.
- Must be stable across restarts. Changing it invalidates pending codes only, which expire within 10 minutes.
- Must never be committed, logged, pasted into reports or written into any tracked file. `server/.env.example` contains only a placeholder that the server refuses.

### 6.2 Generation (run on the DEV host, store only in the DEV environment file)

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Write the output directly into the DEV environment file with an editor. Do not echo it to the terminal, and do not copy it into any document.

### 6.3 Verification without printing the value

From the `server/` directory, under Node 22, with the DEV environment file in place:

```
cd server
node -e "require('dotenv').config({ path: '.env' }); require('./services/OTPService').assertOtpConfigured(); console.log('OTP_HASH_SECRET: ok')"
```

Expected output: `OTP_HASH_SECRET: ok`. On failure Node prints a stack trace ending in an `OTPConfigError` that names the requirement (for example `OTP_HASH_SECRET is not set`) and exits non-zero. The message never contains the value. A stack trace from this command is the expected failure, not a separate fault.

### 6.4 Order of operations

Set `OTP_HASH_SECRET` **before** restarting the DEV app on the new runtime. Otherwise the app will refuse to start and DEV will be down.

## 7. Node 22 and DEV PM2 procedure (execute only after G3 and G4)

Every command in this section runs through **Lightsail SSH** on the DEV host. Sections 3 and 4 may instead run from the operator's Mac through a database tunnel.

### 7.1 Record the current state (Lightsail SSH)

```
pm2 list
pm2 describe <dev-app-name> | grep -E "script path|interpreter|exec cwd"
pm2 jlist > ~/pm2-dev-backup-$(date +%F).json
```

Record the current interpreter path. It is the rollback value.

### 7.2 Install Node 22 for the deploy user (Lightsail SSH)

```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```

This downloads a script. Confirm the URL and the version before running it. Then:

```
nvm install 22.23.2
$HOME/.nvm/versions/node/v22.23.2/bin/node -v    # expect v22.23.2
```

Install the server dependencies with that Node (this rebuilds native modules such as `better-sqlite3` for Node 22):

```
cd <dev-checkout>
$HOME/.nvm/versions/node/v22.23.2/bin/npm ci --prefix server
```

### 7.3 Restart DEV only (Lightsail SSH)

```
pm2 restart <dev-app-name> --interpreter $HOME/.nvm/versions/node/v22.23.2/bin/node --update-env
pm2 describe <dev-app-name> | grep interpreter   # must show the Node 22 path
pm2 logs <dev-app-name> --lines 50 --nostream
```

Confirm in the log that the app starts without the `OTP_HASH_SECRET` error and without `Refusing to start`. If `pm2 describe` still shows the old interpreter, stop and report: do not assume the flag took effect.

### 7.4 Rollback (Lightsail SSH)

```
pm2 restart <dev-app-name> --interpreter <recorded-old-interpreter-path> --update-env
pm2 describe <dev-app-name> | grep interpreter
```

Use the path recorded in 7.1. Keep the Node 22 install in place until the owner decides it is no longer needed.

### 7.5 Production

Do not run `pm2 restart all`, `pm2 reload ecosystem.config.cjs --env production`, or any command that touches the production process. The production runtime is a separate decision.

## 8. Browser verification checklist (DEV, after G2 to G4)

Use MOCK mail, Razorpay **test** mode only, and test accounts created on DEV for this purpose. Confirm each item and report failures with the page, the time, and the server log line (never the code, token or password).

Before starting, confirm the modes:

- [ ] Server log shows mail mode `MOCK` and Zoho mode `MOCK`. No real email leaves DEV.
- [ ] Razorpay key ID starts with `rzp_test_`. Check the prefix only. A `rzp_live_` key stops the test.

Authentication:

- [ ] Login and logout work. Logout with a forged CSRF token is refused.
- [ ] Signup OTP: a code is sent (MOCK) and verifies once. A wrong code is refused. Five wrong codes lock the code.
- [ ] Password reset by OTP and by link: the link uses the URL fragment (`#token=`), not a query string. The token works once.
- [ ] Password change ends other sessions.
- [ ] A member suspended by an admin loses an open session on the next request (`401`).

Roles:

- [ ] Admin, contributor, ambassador and member each reach only their pages. A deactivated account is refused.

Membership:

- [ ] Plans load. Checkout completes in test mode. A failed payment is shown as failed.
- [ ] Webhook: a signed test event activates membership. An unsigned or wrongly signed event is refused.
- [ ] Membership expiry behaves as designed.

Files:

- [ ] Upload, then download with the header token. A query-string token is not accepted.
- [ ] Ownership and price controls behave as designed. Deletion of a shared file is protected.

Content:

- [ ] Blog save and edit. News, learnings, FAQ, announcements, comments.
- [ ] Admin preview of a legacy post shows no script execution.

Integrations:

- [ ] Zoho: MOCK only. No invoice is created in any real Zoho account.

## 9. Explicitly prohibited

- Pushing commits, or deploying anything not approved under section 1.
- Any migration on DEV or production (`migrate-*.js`, the column widening, any SQL `ALTER`/`CREATE`/`DROP`) without the gate in section 1.
- Any purge or deletion of `email_queue` rows. **The legacy OTP purge stays blocked.** It requires two things that do not yet exist:
  1. Independent DEV identity verification. The current `--target` check compares the database name with the value the operator typed. That is not identity verification.
  2. An encrypted backup that has been restored and verified, not only created.
  Until both are implemented and verified, the answer is no.
- Using the production database, production credentials or production settings for any step here.
- Guessing or inventing DEV credentials, hostnames or database names.
- Real emails, real invoices, live Razorpay payments or live webhook endpoints.
- Changing DNS, SSL, or the Nginx configuration on any server. `deploy/nginx.conf` in the repository is a template only; it has not been installed or validated with `nginx -t`.
- Printing, copying or committing secrets: `OTP_HASH_SECRET`, database passwords, Razorpay secrets, SMTP credentials.
- Running any script with `--apply` (`purge-legacy-otp-queue.js`) or any write-capable mode.

## 10. Prerequisites by environment

| Prerequisite | DEV | Production |
|---|---|---|
| Node 22.23.2 for the deploy user (nvm) | Required before restart | Separate decision, not covered here |
| PM2 interpreter set explicitly | Required | Not changed |
| `OTP_HASH_SECRET` set (unique value) | Required (G3) | Required before any production deploy that includes the OTP change |
| Schema check output reviewed | Required | Required, read-only, with a separate approval |
| Column widening (G5) | Only if the check shows `varchar(10)` with strict mode | Separate approval, after a DEV rehearsal |
| Full database dump, restore verified | Required before G5 or G7 | Required before any production migration |
| Legacy OTP queue inspection | Required, aggregate only | Required, aggregate only, with approval |
| Legacy OTP purge | **Blocked** | **Blocked** |
| Nginx access and error log configuration | Install and `nginx -t` only with approval | Separate approval |
| Browser verification (section 8) | Required | Not run as part of this handover |
| Live Razorpay and live Zoho | Not used (test and MOCK only) | Separate decision |

## 11. Known gaps and risks for the operator

1. Schema drift is not resolved. Migration decisions depend on the DEV result.
2. Pre-existing OTP rows in `email_queue` may remain on DEV and production. Their count is unknown until inspection.
3. Existing pending OTP codes stop verifying after the key change. This was approved; users must request new codes.
4. The Node 22 switch and the restart were tested on a development machine, not on the DEV host.
5. The DEV PM2 configuration is outside the repository and has not been seen in this work.
6. The browser checks in section 8 have not been run on DEV.

## 12. Reporting back

Return to the owner:

1. The full output of section 3 (schema) and section 4 (queue). No addresses, subjects, bodies, codes, tokens or secrets.
2. The output of the `SHOW GRANTS` check, with any privilege beyond SELECT stated.
3. The database name and server version that the commands connected to.
4. The result of each gate in section 1 that was executed, and the time it was executed.
5. Any deviation from this document.
