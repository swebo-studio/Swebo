-- CreateTable
CREATE TABLE "ProductColorImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "colorId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProductColorImage_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "ProductColor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
