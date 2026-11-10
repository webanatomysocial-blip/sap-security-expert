-- PREPARED ONLY. Do not run until DEV inspection and backup/restore approval.
-- Preserve existing rows while allowing Telugu, emoji and other Unicode mail content.
ALTER TABLE email_queue
  MODIFY recipient VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  MODIFY subject VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  MODIFY body LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;

-- Read-only verification before/after:
-- SELECT COLUMN_NAME, CHARACTER_SET_NAME, COLLATION_NAME
-- FROM information_schema.COLUMNS
-- WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='email_queue'
--   AND COLUMN_NAME IN ('recipient','subject','body');
