-- Persist GST-exclusive payment snapshots. Review and execute separately.
-- Existing orders remain unchanged; new orders require these columns.
ALTER TABLE payment_orders
  ADD COLUMN discount_paise INT NOT NULL DEFAULT 0 AFTER final_price_paise,
  ADD COLUMN taxable_amount_paise INT NOT NULL DEFAULT 0 AFTER discount_paise,
  ADD COLUMN gst_rate_bps INT NOT NULL DEFAULT 0 AFTER taxable_amount_paise,
  ADD COLUMN cgst_paise INT NOT NULL DEFAULT 0 AFTER gst_rate_bps,
  ADD COLUMN sgst_paise INT NOT NULL DEFAULT 0 AFTER cgst_paise,
  ADD COLUMN igst_paise INT NOT NULL DEFAULT 0 AFTER sgst_paise,
  ADD COLUMN gst_paise INT NOT NULL DEFAULT 0 AFTER igst_paise,
  ADD COLUMN tax_plan VARCHAR(16) DEFAULT NULL AFTER gst_paise;

-- Rollback limitation: do not drop these columns while any GST-exclusive
-- orders exist, because they are the financial audit trail for those charges.
