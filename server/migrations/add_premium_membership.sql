-- Migration: add_premium_membership
-- Adds is_premium flag to blogs + membership_plans + member_subscriptions tables.
-- Run once on production MySQL. SQLite dev DB is handled automatically by db.js.

-- 1. Premium flag on blogs
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS is_premium TINYINT NOT NULL DEFAULT 0;

-- 2. Membership plans
CREATE TABLE IF NOT EXISTS membership_plans (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  price_paise   INT NOT NULL,
  duration_days INT NOT NULL DEFAULT 30,
  description   TEXT DEFAULT '',
  is_active     TINYINT NOT NULL DEFAULT 1,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed default ₹1/month plan
INSERT IGNORE INTO membership_plans (id, name, price_paise, duration_days, description)
VALUES (1, 'Monthly Premium', 100, 30, 'Full access to all premium SAP Security articles for 30 days');

-- 3. Member subscriptions
CREATE TABLE IF NOT EXISTS member_subscriptions (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  member_id            INT NOT NULL,
  plan_id              INT NOT NULL,
  razorpay_order_id    VARCHAR(100),
  razorpay_payment_id  VARCHAR(100),
  status               ENUM('active','expired','failed','cancelled') NOT NULL DEFAULT 'active',
  starts_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at           DATETIME NOT NULL,
  created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sub_member (member_id),
  INDEX idx_sub_order  (razorpay_order_id),
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id)   REFERENCES membership_plans(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
