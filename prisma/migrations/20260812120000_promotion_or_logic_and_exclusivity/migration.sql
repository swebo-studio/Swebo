-- A promotion can now express its conditions as OR ("any") instead of only AND
-- ("all"), so several near-identical promotions can be folded into one.
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "conditionLogic" TEXT NOT NULL DEFAULT 'all';

-- Exclusive by default: overlapping promotions no longer pile onto one product.
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "exclusive" BOOLEAN NOT NULL DEFAULT true;
