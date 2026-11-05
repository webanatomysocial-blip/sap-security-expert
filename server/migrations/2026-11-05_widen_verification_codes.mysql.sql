-- PREPARED, NOT RUN. verification_codes.code stores SHA-256 hex (64 chars) since OTP hashing.
-- The original column is VARCHAR(10); under strict SQL mode every OTP insert then fails with
-- "Data too long for column 'code'", so signup and password-reset codes cannot be sent.
-- Additive and idempotent: MODIFY to a wider type is a no-op when it is already VARCHAR(64).
-- Rollback: see the note at the bottom. Do NOT narrow the column back while hashed rows exist.
ALTER TABLE verification_codes MODIFY `code` VARCHAR(64) NOT NULL;

-- Verify (read-only):
--   SELECT COLUMN_TYPE FROM information_schema.COLUMNS
--    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'verification_codes' AND COLUMN_NAME = 'code';
--   expected after the migration: varchar(64)
--
-- Rollback: MODIFY back to VARCHAR(10) only after deleting every row with LENGTH(code) > 10
-- (expired or used codes are safe to delete; pending codes are lost, so users request new codes).
--   DELETE FROM verification_codes WHERE LENGTH(code) > 10;
--   ALTER TABLE verification_codes MODIFY `code` VARCHAR(10) NOT NULL;
