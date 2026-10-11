-- Two new kinds of promotion next to the existing conditions + rewards one:
-- "N items from a list for a fixed price" and "buy from one list, get from another".
-- Existing promotions keep working unchanged as kind 'rules'.
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'rules';
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "buyQuantity" INTEGER;
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "bundlePrice" INTEGER;
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "getQuantity" INTEGER;
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "getDiscountPct" INTEGER;
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "maxApplications" INTEGER;

CREATE TABLE "PromotionItem" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "productId" TEXT,
    "categoryId" TEXT,
    CONSTRAINT "PromotionItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PromotionItem_promotionId_idx" ON "PromotionItem"("promotionId");

ALTER TABLE "PromotionItem" ADD CONSTRAINT "PromotionItem_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromotionItem" ADD CONSTRAINT "PromotionItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromotionItem" ADD CONSTRAINT "PromotionItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
