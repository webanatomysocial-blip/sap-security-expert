-- ============================================================
-- Cleanup: remove deleted users & deduplicate contributors
-- Run on production AFTER taking a backup.
-- ============================================================

-- 1. Soft-delete users whose contributor record is marked deleted
UPDATE users u
INNER JOIN contributors c ON u.contributor_id = c.id
SET u.is_active = 0,
    u.is_deleted = 1,
    u.deleted_at = NOW()
WHERE c.is_deleted = 1
  AND (u.is_deleted IS NULL OR u.is_deleted = 0);

-- 2. Deactivate duplicate user accounts that share the same contributor_id
--    Keep the one with the lowest id (the original); deactivate the rest.
UPDATE users u
INNER JOIN (
  SELECT contributor_id, MIN(id) AS keep_id
  FROM users
  WHERE contributor_id IS NOT NULL
    AND is_active = 1
    AND (is_deleted IS NULL OR is_deleted = 0)
  GROUP BY contributor_id
  HAVING COUNT(*) > 1
) dupes ON u.contributor_id = dupes.contributor_id AND u.id != dupes.keep_id
SET u.is_active = 0,
    u.is_deleted = 1,
    u.deleted_at = NOW()
WHERE (u.is_deleted IS NULL OR u.is_deleted = 0);

-- 3. Verify: show remaining active, non-deleted authors
SELECT u.id, u.username, u.role, u.is_active, u.is_deleted,
       COALESCE(c.full_name, u.full_name, u.username) AS display_name,
       c.is_deleted AS contributor_deleted
FROM users u
LEFT JOIN contributors c ON u.contributor_id = c.id
WHERE u.is_active = 1
  AND (u.is_deleted IS NULL OR u.is_deleted = 0)
  AND (c.id IS NULL OR (c.is_deleted IS NULL OR c.is_deleted = 0))
ORDER BY display_name ASC;
