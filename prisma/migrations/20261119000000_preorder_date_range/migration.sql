-- Estimated arrival as a range: preorderDate is its start, preorderDateTo its end
ALTER TABLE "Product" ADD COLUMN "preorderDateTo" TEXT;
