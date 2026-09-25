-- Missing schema found by comparing sap_security_expert_DEV_20260925_042736.sql
-- (MariaDB 10.11) against what the application code expects.
-- Safe to run more than once (IF NOT EXISTS). Run on the DEV database.

-- 1) Missing column: blogs.preview_unit
--    Used when saving/creating any post and by the Premium / Exclusive toggles
--    ("blocks" or "lines" for how much of a paywalled article is previewed).
--    Without it those requests fail with "Unknown column 'preview_unit'".
ALTER TABLE `blogs`
  ADD COLUMN IF NOT EXISTS `preview_unit` VARCHAR(10) DEFAULT 'blocks';

-- 2) Missing unique key: email_queue (blog_id, recipient)
--    Stops the same article notification being queued twice for one recipient.
--    email_queue is empty in the dump, so this cannot fail on duplicates.
ALTER TABLE `email_queue`
  ADD UNIQUE INDEX IF NOT EXISTS `uq_email_queue_blog_recipient` (`blog_id`, `recipient`);

-- 3) Missing performance indexes (speed up the admin members list)
CREATE INDEX IF NOT EXISTS `idx_members_referred`      ON `members` (`referred_by_code`);
CREATE INDEX IF NOT EXISTS `idx_members_referral_code` ON `members` (`referral_code`);
