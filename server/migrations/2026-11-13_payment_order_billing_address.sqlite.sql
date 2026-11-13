ALTER TABLE payment_orders ADD COLUMN billing_address TEXT DEFAULT NULL;
ALTER TABLE payment_orders ADD COLUMN billing_address2 TEXT DEFAULT NULL;
ALTER TABLE payment_orders ADD COLUMN billing_city TEXT DEFAULT NULL;
ALTER TABLE payment_orders ADD COLUMN billing_postal_code TEXT DEFAULT NULL;
