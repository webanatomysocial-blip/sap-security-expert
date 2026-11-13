-- SQLite equivalent of 2026-11-13_payment_order_gst_snapshot.mysql.sql.
-- Apply once to a local SQLite database before GST-exclusive checkout testing.
ALTER TABLE payment_orders ADD COLUMN discount_paise INTEGER NOT NULL DEFAULT 0;
ALTER TABLE payment_orders ADD COLUMN taxable_amount_paise INTEGER NOT NULL DEFAULT 0;
ALTER TABLE payment_orders ADD COLUMN gst_rate_bps INTEGER NOT NULL DEFAULT 0;
ALTER TABLE payment_orders ADD COLUMN cgst_paise INTEGER NOT NULL DEFAULT 0;
ALTER TABLE payment_orders ADD COLUMN sgst_paise INTEGER NOT NULL DEFAULT 0;
ALTER TABLE payment_orders ADD COLUMN igst_paise INTEGER NOT NULL DEFAULT 0;
ALTER TABLE payment_orders ADD COLUMN gst_paise INTEGER NOT NULL DEFAULT 0;
ALTER TABLE payment_orders ADD COLUMN tax_plan TEXT DEFAULT NULL;
