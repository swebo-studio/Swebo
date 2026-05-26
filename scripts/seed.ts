import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import { copyFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const dbPath = join(__dirname, "../dev.db");
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter } as never);

const IMAGES_DIR = join(__dirname, "../../Images");
const UPLOADS_DIR = join(__dirname, "../public/uploads");

const products = [
  {
    nameHe: 'חולצה ירוקה – סגנון ברזיל',
    descriptionHe: 'חולצה בסגנון ג\'רזי ספורט בצבע ירוק מלכותי מט\'',
    originalImage: "Brazil Green.jpeg",
  },
  {
    nameHe: 'חולצה ירוקה – ברזיל 2',
    descriptionHe: 'גרסה שנייה של החולצה הירוקה המלכותית',
    originalImage: "Brazil Green 2.jpeg",
  },
  {
    nameHe: 'חולצה אדומה – סגנון פורטוגל',
    descriptionHe: 'חולצה בצבע ארגמן עמוק בסגנון ג\'רזי ספורט',
    originalImage: "Portugal Red.jpeg",
  },
  {
    nameHe: 'חולצה כחולה – סגנון ארגנטינה',
    descriptionHe: 'חולצה בצבע תכלת בייבי עדין בסגנון ג\'רזי',
    originalImage: "Argentina Blue.jpeg",
  },
  {
    nameHe: 'חולצה לבנה – סגנון צרפת',
    descriptionHe: 'חולצה לבנה נקייה בסגנון ג\'רזי ספורט',
    originalImage: "France White.jpeg",
  },
  {
    nameHe: 'חולצה לבנה – סגנון ספרד',
    descriptionHe: 'חולצה לבנה בסגנון ספרדי מעוצב',
    originalImage: "Spain White.jpeg",
  },
];

async function main() {
  console.log("🌱 Seeding database...");

  // Ensure uploads dir exists
  if (!existsSync(UPLOADS_DIR)) {
    await mkdir(UPLOADS_DIR, { recursive: true });
  }

  // Create admin
  const existing = await prisma.admin.findUnique({ where: { username: "admin" } });
  if (!existing) {
    const hash = await bcrypt.hash("swebo2024", 10);
    await prisma.admin.create({
      data: { username: "admin", password: hash },
    });
    console.log("✅ Admin created: admin / swebo2024");
  } else {
    console.log("ℹ️  Admin already exists");
  }

  // Seed products
  for (const p of products) {
    const srcPath = join(IMAGES_DIR, p.originalImage);
    const destName = p.originalImage.replace(/ /g, "_");
    const destPath = join(UPLOADS_DIR, destName);

    if (existsSync(srcPath)) {
      await copyFile(srcPath, destPath);
    }

    const imageUrl = existsSync(srcPath) ? `/uploads/${destName}` : "";

    const already = await prisma.product.findFirst({
      where: { nameHe: p.nameHe },
    });

    if (!already) {
      await prisma.product.create({
        data: {
          nameHe: p.nameHe,
          descriptionHe: p.descriptionHe,
          price: 150,
          stock: 10,
          image: imageUrl,
          active: true,
        },
      });
      console.log(`✅ Product: ${p.nameHe}`);
    } else {
      console.log(`ℹ️  Exists: ${p.nameHe}`);
    }
  }

  console.log("✨ Done!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
