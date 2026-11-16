-- Stores the Zoho customer-payment ID linked to a captured Razorpay payment.
-- Apply once to MySQL/MariaDB deployments before enabling this release.
ALTER TABLE payment_orders
  ADD COLUMN zoho_payment_id VARCHAR(255) DEFAULT NULL AFTER zoho_invoice_id;
