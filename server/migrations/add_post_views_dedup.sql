-- Deduplication table for blog view counts.
-- Prevents the same visitor from incrementing view_count multiple times.
CREATE TABLE IF NOT EXISTS post_views (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  post_id       VARCHAR(255) NOT NULL,
  visitor_token VARCHAR(64)  NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pv_dedup (post_id, visitor_token),
  KEY idx_pv_post (post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
