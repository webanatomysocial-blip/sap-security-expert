-- Rollback for 2026-11-05_file_ownership. Removes only what the backfill and the
-- ownership code added. Run ONLY after restoring the matching backup if prices were changed.
DELETE FROM file_ownership_audit WHERE file_url IN (SELECT file_url FROM file_ownership WHERE source IN ('upload','backfill','admin-claim'));
DELETE FROM file_ownership WHERE source IN ('upload','backfill','admin-claim');
DROP TABLE IF EXISTS file_ownership_audit;
DROP TABLE IF EXISTS file_ownership;
