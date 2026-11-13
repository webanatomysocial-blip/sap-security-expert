-- Buyer location for GST on credit and membership purchases.
-- buyer_state: Indian state name (required when buyer_country is India).
-- buyer_country: country name ('India' or the buyer's country for export sales).
-- Safe to run more than once.
ALTER TABLE payment_orders
  ADD COLUMN IF NOT EXISTS buyer_state VARCHAR(64) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS buyer_country VARCHAR(60) DEFAULT NULL;
