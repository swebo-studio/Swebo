-- A promotion can put a tag on the product cards it covers, with its own
-- text, color, size and corner. Off for every existing promotion.
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "badgeEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "badgeText" TEXT;
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "badgeColor" TEXT NOT NULL DEFAULT '#1E6B3C';
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "badgeSize" TEXT NOT NULL DEFAULT 'md';
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "badgePosition" TEXT NOT NULL DEFAULT 'bottom-left';
