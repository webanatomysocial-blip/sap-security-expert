-- Add expert pick flag to blogs
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS is_expert_pick TINYINT(1) NOT NULL DEFAULT 0;
