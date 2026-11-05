-- Permanent file ownership (MariaDB / MySQL). Additive only; idempotent.
-- Rollback: migrations/2026-11-05_file_ownership.rollback.sql
CREATE TABLE IF NOT EXISTS file_ownership (
  file_url        VARCHAR(255) NOT NULL,
  owner_user_id   INT NOT NULL,
  price_credits   INT NOT NULL DEFAULT 0,
  source          VARCHAR(20) NOT NULL DEFAULT 'upload',
  needs_review    TINYINT NOT NULL DEFAULT 0,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      DATETIME NULL,
  PRIMARY KEY (file_url),
  KEY idx_file_owner (owner_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS file_ownership_audit (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  file_url        VARCHAR(255) NOT NULL,
  action          VARCHAR(40) NOT NULL,
  actor_user_id   INT NULL,
  old_price       INT NULL,
  new_price       INT NULL,
  reason          VARCHAR(255) NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_fo_audit_file (file_url)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
