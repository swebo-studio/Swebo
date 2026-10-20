-- A free-shipping promotion can cover home delivery, pickup points or both.
-- Existing ones stay NULL, read as "both" — what the order API already charged.
ALTER TABLE "PromotionReward" ADD COLUMN IF NOT EXISTS "shippingScope" TEXT;
