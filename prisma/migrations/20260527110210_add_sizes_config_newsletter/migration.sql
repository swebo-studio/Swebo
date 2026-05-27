-- CreateTable
CREATE TABLE "ProductColorSize" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "colorId" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProductColorSize_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "ProductColor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SiteConfig" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Newsletter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT,
    "email" TEXT,
    "couponCode" TEXT NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "discountPct" INTEGER NOT NULL DEFAULT 5,
    "usedByEmail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductColorSize_colorId_size_key" ON "ProductColorSize"("colorId", "size");

-- CreateIndex
CREATE UNIQUE INDEX "Newsletter_couponCode_key" ON "Newsletter"("couponCode");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");
