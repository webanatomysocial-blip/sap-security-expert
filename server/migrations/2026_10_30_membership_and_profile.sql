-- Migration: membership access + member profile fields
-- Target: production MariaDB 10.11 (sap_security_expert_dev dump of 2026-10-30)
-- Safe to run more than once (IF NOT EXISTS / NOT EXISTS guards).
-- Additive only: no data is deleted or modified.

-- 1. Member profile fields (used by profile settings + public profile)
ALTER TABLE `members`
  ADD COLUMN IF NOT EXISTS `headline`           VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `linkedin`           VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `expertise_tags`     TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `sap_certifications` TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `bio`                TEXT         DEFAULT NULL;

-- 2. Membership vs credit purchases on payment orders
ALTER TABLE `payment_orders`
  ADD COLUMN IF NOT EXISTS `order_type` VARCHAR(20) NOT NULL DEFAULT 'credits',
  ADD COLUMN IF NOT EXISTS `plan_id`    INT         DEFAULT NULL;

-- 3. How an article/file was unlocked: 'credits' = permanent, 'membership' = while active.
--    Existing rows default to 'credits', so everything already unlocked stays permanent.
ALTER TABLE `member_blog_unlocks`
  ADD COLUMN IF NOT EXISTS `source` VARCHAR(20) NOT NULL DEFAULT 'credits';
ALTER TABLE `member_file_downloads`
  ADD COLUMN IF NOT EXISTS `source` VARCHAR(20) NOT NULL DEFAULT 'credits';

-- 4. Membership plans (table exists but is empty). Seeded INACTIVE at a ₹1
--    placeholder price — set real prices and activate them in Admin → Credits → Membership.
INSERT INTO `membership_plans` (`name`, `price_paise`, `duration_days`, `description`, `is_active`)
SELECT '1 Month', 100, 30, 'Full access to all premium articles and downloads for 1 month', 0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `membership_plans` WHERE `duration_days` = 30);

INSERT INTO `membership_plans` (`name`, `price_paise`, `duration_days`, `description`, `is_active`)
SELECT '3 Months', 100, 90, 'Full access to all premium articles and downloads for 3 months', 0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `membership_plans` WHERE `duration_days` = 90);

INSERT INTO `membership_plans` (`name`, `price_paise`, `duration_days`, `description`, `is_active`)
SELECT '6 Months', 100, 180, 'Full access to all premium articles and downloads for 6 months', 0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `membership_plans` WHERE `duration_days` = 180);

INSERT INTO `membership_plans` (`name`, `price_paise`, `duration_days`, `description`, `is_active`)
SELECT '1 Year', 100, 365, 'Full access to all premium articles and downloads for 1 year', 0
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `membership_plans` WHERE `duration_days` = 365);
