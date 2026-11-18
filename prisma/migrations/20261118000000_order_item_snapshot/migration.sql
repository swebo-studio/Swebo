-- Orders keep their own copy of what was bought, and deleting a product no
-- longer touches past orders.

ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "productName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "productImage" TEXT;

-- Copy name and photo (the bought colour's first photo, else the product's)
-- onto every existing line while the products are still here.
UPDATE "OrderItem" i SET
  "productName" = p."nameHe",
  "productImage" = COALESCE(
    (SELECT ci."url" FROM "ProductColor" c JOIN "ProductColorImage" ci ON ci."colorId" = c."id"
      WHERE c."productId" = p."id" AND c."nameHe" = i."color" ORDER BY ci."sortOrder", ci."id" LIMIT 1),
    (SELECT c."imageUrl" FROM "ProductColor" c
      WHERE c."productId" = p."id" AND c."nameHe" = i."color" AND c."imageUrl" IS NOT NULL AND c."imageUrl" <> '' LIMIT 1),
    NULLIF(p."image", '')
  )
FROM "Product" p
WHERE p."id" = i."productId" AND i."productName" = '';

ALTER TABLE "OrderItem" ALTER COLUMN "productId" DROP NOT NULL;
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_productId_fkey";
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
