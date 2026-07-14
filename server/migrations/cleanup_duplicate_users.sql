-- ============================================================
-- Remove duplicate user accounts (same display_name, no contributor_id)
-- Keeps the LOWER id (original account), soft-deletes the duplicate.
-- ============================================================

-- Dhanush Reddy Nalla: keep id=14, remove id=15
UPDATE users SET is_active = 0, is_deleted = 1, deleted_at = NOW()
WHERE id = 15;

-- Udaya Sri: keep id=9, remove id=10
UPDATE users SET is_active = 0, is_deleted = 1, deleted_at = NOW()
WHERE id = 10;

-- Verify clean result
SELECT u.id, u.username, u.role,
       COALESCE(c.full_name, u.full_name, u.username) AS display_name,
       u.is_active, u.is_deleted
FROM users u
LEFT JOIN contributors c ON u.contributor_id = c.id
WHERE u.is_active = 1
  AND (u.is_deleted IS NULL OR u.is_deleted = 0)
  AND (c.id IS NULL OR c.is_deleted IS NULL OR c.is_deleted = 0)
ORDER BY display_name ASC;
