-- A coupon can be a content creator's code: paid orders that used it earn the
-- creator a commission, tracked against what has been paid out to them.
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "collab" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "collabName" TEXT;
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "collabPct" DOUBLE PRECISION;
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "collabPhone" TEXT;

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "collabCode" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "collabCommission" DOUBLE PRECISION;
CREATE INDEX IF NOT EXISTS "Order_collabCode_idx" ON "Order"("collabCode");

CREATE TABLE IF NOT EXISTS "CollabPayout" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CollabPayout_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CollabPayout_couponId_idx" ON "CollabPayout"("couponId");
DO $$ BEGIN
  ALTER TABLE "CollabPayout" ADD CONSTRAINT "CollabPayout_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
