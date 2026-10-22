-- Admins can star an order in the orders list to flag it.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "starred" BOOLEAN NOT NULL DEFAULT false;
