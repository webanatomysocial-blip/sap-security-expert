-- Adds razorpay_payment_id to payment_orders so the Razorpay payment_id that
-- settles each order is stored alongside the order record. Previously it was
-- only used for HMAC verification and then discarded, leaving no audit trail.

ALTER TABLE `payment_orders`
  ADD COLUMN `razorpay_payment_id` varchar(255) DEFAULT NULL
  AFTER `razorpay_order_id`;
