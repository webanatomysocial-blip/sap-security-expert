-- Migration: Add profile columns to users table
-- Target: MySQL (Production) & SQLite (Local)

-- For MySQL/MariaDB
-- ALTER TABLE `users` 
-- ADD COLUMN `full_name` VARCHAR(255) AFTER `username`,
-- ADD COLUMN `email` VARCHAR(255) AFTER `full_name`,
-- ADD COLUMN `profile_image` VARCHAR(255) AFTER `email`,
-- ADD COLUMN `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
-- ADD UNIQUE KEY `email_unique` (`email`);

-- For SQLite (executed via PHP pdo)
-- Since SQLite doesn't support multiple columns in one ALTER TABLE, 
-- we execute them individually or use the PHP logic.

-- Full MySQL Schema Update (for reference)
SET FOREIGN_KEY_CHECKS = 0;
ALTER TABLE `users` ADD COLUMN `full_name` VARCHAR(255) AFTER `username`;
ALTER TABLE `users` ADD COLUMN `email` VARCHAR(255) AFTER `full_name`;
ALTER TABLE `users` ADD COLUMN `profile_image` VARCHAR(255) AFTER `email`;
ALTER TABLE `users` ADD COLUMN `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
ALTER TABLE `users` ADD UNIQUE KEY `email_unique` (`email`);
SET FOREIGN_KEY_CHECKS = 1;
