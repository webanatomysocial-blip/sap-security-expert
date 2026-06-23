-- Migration: backfill_is_queued_for_members
-- Problem: is_queued_for_members was added to the blogs table with DEFAULT 0.
-- Any blog that existed before the column was added gets DEFAULT 0, so the
-- first run of queuePendingBlogNotifications() would re-queue ALL historical
-- articles and flood every member with old notification emails.
-- Fix: mark all currently approved/published blogs as already queued so only
-- genuinely new articles get picked up going forward.

UPDATE blogs
SET    is_queued_for_members = 1
WHERE  status IN ('approved', 'published')
  AND  is_queued_for_members = 0;

-- After running this, only articles inserted after this migration
-- (which start with is_queued_for_members = 0 by default) will be picked up
-- by queuePendingBlogNotifications() on the next cron run.
