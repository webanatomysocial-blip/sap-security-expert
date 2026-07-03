-- Migration: add_refund_idempotency
-- Adds a nullable, uniquely-indexed razorpay_refund_id column to credit_transactions
-- so a refund webhook can be safely retried by Razorpay without reversing credits twice.
-- razorpay_order_id is already occupied by the original purchase row, so refund
-- reversal rows need their own idempotency key.
-- Run once on production MySQL. SQLite dev DB is handled automatically by db.js.

ALTER TABLE credit_transactions ADD COLUMN razorpay_refund_id VARCHAR(255) DEFAULT NULL;
ALTER TABLE credit_transactions ADD UNIQUE KEY uq_ctx_refund (razorpay_refund_id);
