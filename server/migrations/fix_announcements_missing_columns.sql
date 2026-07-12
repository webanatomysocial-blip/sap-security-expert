-- Run this on production to add any columns that may be missing from the
-- original announcements table (added in later versions of the schema).

ALTER TABLE `announcements`
  ADD COLUMN IF NOT EXISTS `slug`               varchar(500)  DEFAULT '',
  ADD COLUMN IF NOT EXISTS `content`            longtext      DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `excerpt`            text          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `image`              varchar(255)  DEFAULT '',
  ADD COLUMN IF NOT EXISTS `image_alt`          varchar(255)  DEFAULT '',
  ADD COLUMN IF NOT EXISTS `submission_status`  varchar(255)  DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS `draft_title`        longtext      DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `draft_date`         date          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `draft_link`         longtext      DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `updated_at`         datetime      DEFAULT NULL;
