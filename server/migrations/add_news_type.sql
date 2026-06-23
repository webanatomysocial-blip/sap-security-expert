-- Add `type` column to blogs table to distinguish blog posts from news/updates items.
-- Values: 'blog' (default, all existing rows) | 'news'
ALTER TABLE blogs ADD COLUMN `type` VARCHAR(20) NOT NULL DEFAULT 'blog';
UPDATE blogs SET `type` = 'blog' WHERE `type` IS NULL OR `type` = '';
