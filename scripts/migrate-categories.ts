/**
 * Manual migration: convert Product.categoryId (one-to-many)
 * to _ProductCategories join table (many-to-many).
 *
 * Safe to run multiple times — uses IF NOT EXISTS / INSERT OR IGNORE.
 */
import Database from "better-sqlite3";
import path from "path";

const db = new Database(path.join(process.cwd(), "dev.db"));

db.pragma("foreign_keys = OFF");

// 1. Create the join table (if not yet created by the failed first attempt)
db.exec(`
  CREATE TABLE IF NOT EXISTS "_ProductCategories" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ProductCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ProductCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );
`);

db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS "_ProductCategories_AB_unique" ON "_ProductCategories"("A", "B");`);
db.exec(`CREATE INDEX IF NOT EXISTS "_ProductCategories_B_index" ON "_ProductCategories"("B");`);

// 2. Migrate existing categoryId assignments into the join table
const hasCol = db.prepare(`PRAGMA table_info(Product)`).all() as { name: string }[];
if (hasCol.some((c) => c.name === "categoryId")) {
  const rows = db.prepare(`SELECT id, categoryId FROM Product WHERE categoryId IS NOT NULL`).all() as { id: string; categoryId: string }[];
  const insert = db.prepare(`INSERT OR IGNORE INTO "_ProductCategories" (A, B) VALUES (?, ?)`);
  const tx = db.transaction(() => {
    for (const row of rows) {
      insert.run(row.categoryId, row.id);
    }
  });
  tx();
  console.log(`Migrated ${rows.length} existing category assignments.`);

  // 3. Recreate Product table without categoryId
  db.exec(`
    CREATE TABLE "Product_new" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "nameHe" TEXT NOT NULL,
      "descriptionHe" TEXT NOT NULL DEFAULT '',
      "price" REAL NOT NULL DEFAULT 150,
      "stock" INTEGER NOT NULL DEFAULT 0,
      "image" TEXT NOT NULL DEFAULT '',
      "active" BOOLEAN NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    INSERT INTO "Product_new" SELECT "id","nameHe","descriptionHe","price","stock","image","active","createdAt","updatedAt" FROM "Product";
    DROP TABLE "Product";
    ALTER TABLE "Product_new" RENAME TO "Product";
  `);
  console.log("Recreated Product table without categoryId.");
} else {
  console.log("categoryId already removed — skipping table recreation.");
}

db.pragma("foreign_keys = ON");
db.close();
console.log("Migration complete.");
