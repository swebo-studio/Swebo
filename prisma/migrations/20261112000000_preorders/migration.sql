-- Preorders: products sold before they are in stock. Their orders wait in the
-- "preorder" order stage until an admin releases them to HFD.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "preorder" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "preorderDate" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "hfdSentAt" TIMESTAMP(3);
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "preorder" BOOLEAN NOT NULL DEFAULT false;
