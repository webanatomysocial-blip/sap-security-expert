-- PREPARED ONLY — DEV email_queue remediation, version 2, STAGE 1 OF 2.
--
-- Preconditions (all require separate approval):
--   * An encrypted DEV backup has been created, checksummed, and restored into
--     an isolated sse_restore_* database with counts/schema verified.
--   * Run every preflight query below immediately before this file. Do not run
--     if any width-risk count is non-zero.
--   * Review charset-risk notes: latin1 -> utf8mb4 preserves latin1 code points,
--     but cannot repair historic UTF-8-as-latin1 mojibake. Never "fix" text by
--     heuristic during this migration.
--
-- DEV preflight on 2026-11-10: 2 rows, zero duplicate non-NULL recipient/blog
-- pairs, and no values exceeding the widths below. Re-run; queue contents may
-- change between this recorded inspection and an approved execution window.

-- Pre-migration aggregate gate. This returns counts only; do not SELECT row data.
SELECT
  COUNT(*) AS total_rows,
  SUM(recipient IS NULL) AS recipient_nulls,
  SUM(subject IS NULL) AS subject_nulls,
  SUM(body IS NULL) AS body_nulls,
  SUM(blog_id IS NULL) AS blog_id_nulls,
  MAX(CHAR_LENGTH(subject)) AS max_subject_chars,
  MAX(CHAR_LENGTH(body)) AS max_body_chars,
  MAX(CHAR_LENGTH(blog_id)) AS max_blog_id_chars,
  SUM(CHAR_LENGTH(subject) > 500) AS subject_over_500,
  SUM(CHAR_LENGTH(blog_id) > 255) AS blog_id_over_255
FROM email_queue;

-- Existing DEV semantics are preserved deliberately:
--   recipient: NOT NULL, no explicit default
--   subject:   NOT NULL, no explicit default (widened 255 -> 500)
--   body:      NOT NULL, no explicit default (widened TEXT -> LONGTEXT)
--   blog_id:   nullable and retained at VARCHAR(255), rather than narrowed to
--              the creation-SQL's 100. It is a compatible superset and avoids
--              truncating future values.
--   status/error_message/defaults and queue rows are not otherwise changed.
-- CONVERT changes all textual queue columns to utf8mb4_unicode_ci.
ALTER TABLE email_queue
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  MODIFY recipient VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  MODIFY subject VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  MODIFY body LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  MODIFY blog_id VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL;

-- MariaDB DDL commits independently. This conversion/widening ALTER is not
-- transactionally coupled to the unique-index stage. If it succeeds, do not
-- restore merely because stage 2 has not yet run: verify this stage below, keep
-- the encrypted backup, and proceed only with the separately reviewed stage 2.
-- If this ALTER itself fails, stop; determine its completed state through the
-- information_schema query below before any retry. It never deletes queue rows.

-- Stage-1 verification (read-only). A successful result is the hand-off point
-- to 2026-11-10_email_queue_utf8mb4_v2_add_unique.mysql.sql.
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT,
       CHARACTER_SET_NAME, COLLATION_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'email_queue'
ORDER BY ORDINAL_POSITION;

SELECT INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'email_queue'
ORDER BY INDEX_NAME, SEQ_IN_INDEX;

-- Recovery: do not narrow types or convert back in place. Such a conversion can
-- be lossy once utf8mb4 text exists. Restore the separately verified encrypted
-- backup only if the approved recovery decision requires returning to pre-stage-1.
