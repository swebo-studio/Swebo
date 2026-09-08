-- Sizes are free-form labels now (shoes "42", pants "34/32"), so the display
-- order can no longer be read off a hardcoded XS..XXL array in the UI.
ALTER TABLE "ProductColorSize" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Backfill so existing garments keep the order customers already see.
-- Anything unrecognised sorts after the known labels (queries break the tie by label).
UPDATE "ProductColorSize" SET "sortOrder" = CASE "size"
  WHEN 'XS'  THEN 0
  WHEN 'S'   THEN 1
  WHEN 'M'   THEN 2
  WHEN 'L'   THEN 3
  WHEN 'XL'  THEN 4
  WHEN 'XXL' THEN 5
  ELSE 99
END
WHERE NOT EXISTS (SELECT 1 FROM "ProductColorSize" WHERE "sortOrder" <> 0);

-- Per-product override for the store-wide cm measurements table:
-- null = follow the global setting, false = hide it on this product only.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "showSizeChart" BOOLEAN;
