-- Add parent_id to comments table for threaded replies
ALTER TABLE `comments` 
ADD COLUMN `parent_id` INT(11) NULL DEFAULT NULL AFTER `post_id`,
ADD CONSTRAINT `fk_comments_parent` FOREIGN KEY (`parent_id`) REFERENCES `comments` (`id`) ON DELETE CASCADE,
ADD INDEX `idx_parent_id` (`parent_id`);
