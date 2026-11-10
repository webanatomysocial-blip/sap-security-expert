-- PREPARED ONLY. Do not run until DEV inspection and backup/restore approval.
-- Preserve existing column types and nullability while allowing Telugu, emoji
-- and other Unicode mail content.
ALTER TABLE email_queue
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Rollback limitation: converting these columns back to a narrower character
-- set can be lossy or fail once utf8mb4 content exists. Restore the independently
-- verified encrypted backup instead of attempting an in-place charset rollback.

-- Read-only verification before/after:
-- SELECT COLUMN_NAME, CHARACTER_SET_NAME, COLLATION_NAME
-- FROM information_schema.COLUMNS
-- WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='email_queue'
--   AND COLUMN_NAME IN ('recipient','subject','body');
