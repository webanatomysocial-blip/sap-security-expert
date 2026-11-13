ALTER TABLE payment_orders
  ADD COLUMN billing_address VARCHAR(500) DEFAULT NULL AFTER buyer_country,
  ADD COLUMN billing_address2 VARCHAR(255) DEFAULT NULL AFTER billing_address,
  ADD COLUMN billing_city VARCHAR(100) DEFAULT NULL AFTER billing_address2,
  ADD COLUMN billing_postal_code VARCHAR(50) DEFAULT NULL AFTER billing_city;
