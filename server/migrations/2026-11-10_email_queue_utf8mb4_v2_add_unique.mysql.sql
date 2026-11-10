-- PREPARED ONLY — DEV email_queue remediation, version 2, STAGE 2 OF 2.
-- Run only after stage 1 has completed and its information_schema verification
-- confirms utf8mb4_unicode_ci, subject VARCHAR(500), body LONGTEXT, and nullable
-- blog_id VARCHAR(255). This file intentionally contains no conversion DDL.
--
-- MariaDB DDL commits independently. This stage is not part of a transaction
-- with stage 1. Keep the verified encrypted backup available throughout.

-- Completion/retry guard: if this exact unique key is already present, stage 2
-- already completed. Do not rerun ALTER; record completion and move to post-checks.
SELECT INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'email_queue'
  AND INDEX_NAME = 'uq_email_queue_recipient_blog'
ORDER BY SEQ_IN_INDEX;

-- This aggregate deliberately uses the *target* collation, after stage 1, so
-- pairs that were distinct under latin1 but compare equal under utf8mb4_unicode_ci
-- are detected. It returns counts only; never print recipient/blog values.
SELECT
  COUNT(*) AS duplicate_target_collation_groups,
  COALESCE(SUM(pair_count), 0) AS duplicate_target_collation_rows,
  COALESCE(SUM(pair_count - 1), 0) AS duplicate_target_collation_excess_rows
FROM (
  SELECT
    recipient COLLATE utf8mb4_unicode_ci AS recipient_key,
    blog_id COLLATE utf8mb4_unicode_ci AS blog_id_key,
    COUNT(*) AS pair_count
  FROM email_queue
  WHERE recipient IS NOT NULL AND blog_id IS NOT NULL
  GROUP BY
    recipient COLLATE utf8mb4_unicode_ci,
    blog_id COLLATE utf8mb4_unicode_ci
  HAVING COUNT(*) > 1
) AS duplicate_pairs;

-- Operator gate: proceed only when the query above reports zero groups and the
-- prior index query reports no uq_email_queue_recipient_blog index. Do not delete,
-- merge, normalise, or heuristically repair records to make this pass.
--
-- This statement immediately follows the target-collation gate. It is also a
-- database-enforced race check: a duplicate inserted after the SELECT makes the
-- ALTER fail without deleting or changing queue rows. MariaDB permits multiple
-- NULL blog_id values, preserving the existing nullable semantics.
ALTER TABLE email_queue
  ADD UNIQUE KEY uq_email_queue_recipient_blog (recipient, blog_id);

-- If ALTER fails due to duplicate values, stage 1 remains valid and committed.
-- Stop, retain the backup, report only aggregate duplicate counts, and make a
-- separate business decision; do not retry until the cause is resolved. Recovery
-- to pre-stage-1 is restore of the verified encrypted backup, never in-place
-- narrowing or deletion. If ALTER succeeds, it is complete; the index guard at
-- the top of this file makes its completion state visible for later operators.

-- Stage-2 post-verification (read-only):
SELECT INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'email_queue'
ORDER BY INDEX_NAME, SEQ_IN_INDEX;
