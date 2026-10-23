-- Migration: Add international currency columns to payment_orders
-- Adds order_currency and order_amount_foreign for international payments reconciliation.
-- Idempotent: Can be run safely on existing or new environments.

ALTER TABLE `payment_orders`
  ADD COLUMN IF NOT EXISTS `order_currency` VARCHAR(10) NOT NULL DEFAULT 'INR' AFTER `final_price_paise`,
  ADD COLUMN IF NOT EXISTS `order_amount_foreign` BIGINT DEFAULT NULL AFTER `order_currency`;
