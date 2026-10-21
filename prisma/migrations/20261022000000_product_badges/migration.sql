-- A product can carry its own tag on its card ("NEW DROP", "מהדורה מוגבלת"),
-- apart from the tags promotions put there. No tag on any existing product.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "badgeText" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "badgeColor" TEXT NOT NULL DEFAULT '#111111';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "badgeSize" TEXT NOT NULL DEFAULT 'md';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "badgePosition" TEXT NOT NULL DEFAULT 'top-left';
