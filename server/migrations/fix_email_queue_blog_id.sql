-- Migration: fix_email_queue_blog_id
-- Problem: blog_id was INT but blog IDs are strings like 'blog_1748964810000'.
-- In MySQL, inserting a string into an INT column silently stores 0, so every
-- blog collapses to blog_id=0 and the UNIQUE(recipient, blog_id) constraint
-- blocks all email_queue inserts after the first one per member.
-- Fix: change blog_id to VARCHAR(100).

-- Step 1: drop the unique index (required before MODIFY COLUMN in MySQL)
DROP INDEX IF EXISTS idx_recipient_blog ON email_queue;

-- Step 2: change the column type to VARCHAR(100)
ALTER TABLE email_queue MODIFY COLUMN blog_id VARCHAR(100) DEFAULT NULL;

-- Step 3: rebuild the unique index on the corrected column
CREATE UNIQUE INDEX idx_recipient_blog ON email_queue (recipient, blog_id);
