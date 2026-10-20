-- A coupon can make delivery free (to the home, to a pickup point, or both)
-- instead of taking money off the items. Existing coupons stay discount coupons.
ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "freeShipping" TEXT;
