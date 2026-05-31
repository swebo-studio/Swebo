import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL_UNPOOLED! });
const prisma = new PrismaClient({ adapter } as never);

async function createProduct({
  nameHe,
  price,
  categoryId,
  images,
}: {
  nameHe: string;
  price: number;
  categoryId: string;
  images: string[];
}) {
  const existing = await prisma.product.findFirst({ where: { nameHe } });
  if (existing) {
    console.log("  skip (exists):", nameHe);
    return;
  }

  const product = await prisma.product.create({
    data: {
      nameHe,
      price,
      stock: 10,
      active: true,
      categories: { connect: { id: categoryId } },
      image: images[0],
    },
  });

  for (let i = 0; i < images.length; i++) {
    await prisma.productImage.create({
      data: { productId: product.id, url: images[i], sortOrder: i },
    });
  }

  console.log("  created:", nameHe);
}

async function main() {
  const [shirts, jackets, pants, shorts] = await Promise.all([
    prisma.category.upsert({ where: { id: "cat-shirts" },  update: {}, create: { id: "cat-shirts",  nameHe: "חולצות",  sortOrder: 0 } }),
    prisma.category.upsert({ where: { id: "cat-jackets" }, update: {}, create: { id: "cat-jackets", nameHe: "ג'קטים",  sortOrder: 1 } }),
    prisma.category.upsert({ where: { id: "cat-pants" },   update: {}, create: { id: "cat-pants",   nameHe: "מכנסיים", sortOrder: 2 } }),
    prisma.category.upsert({ where: { id: "cat-shorts" },  update: {}, create: { id: "cat-shorts",  nameHe: "שורטים",  sortOrder: 3 } }),
  ]);
  console.log("Categories:", shirts.nameHe, jackets.nameHe, pants.nameHe, shorts.nameHe);

  console.log("\n--- Shirts ---");
  await createProduct({ nameHe: "חולצת ארגנטינה",  price: 149, categoryId: shirts.id,  images: ["/uploads/argentina-blue.jpeg"] });
  await createProduct({ nameHe: "חולצת ברזיל",     price: 149, categoryId: shirts.id,  images: ["/uploads/brazil-green-1.jpeg", "/uploads/brazil-green-2.jpeg"] });
  await createProduct({ nameHe: "חולצת צרפת",      price: 149, categoryId: shirts.id,  images: ["/uploads/france-white.jpeg"] });
  await createProduct({ nameHe: "חולצת פורטוגל",   price: 149, categoryId: shirts.id,  images: ["/uploads/portugal-red.jpeg"] });
  await createProduct({ nameHe: "חולצת ספרד",      price: 149, categoryId: shirts.id,  images: ["/uploads/spain-white.jpeg"] });

  console.log("\n--- Jackets ---");
  await createProduct({ nameHe: "בומבר שחור",       price: 249, categoryId: jackets.id, images: ["/uploads/black-bomber.jpeg"] });
  await createProduct({ nameHe: "בומבר אוף-ווייט", price: 249, categoryId: jackets.id, images: ["/uploads/offwhite-bomber.jpeg"] });

  console.log("\n--- Pants ---");
  await createProduct({ nameHe: "מכנסי חליפה שחורים", price: 199, categoryId: pants.id, images: ["/uploads/black-dress-pants.jpeg"] });
  await createProduct({ nameHe: "מכנסי לינן שחורים",  price: 189, categoryId: pants.id, images: ["/uploads/black-linen-pants.jpeg"] });
  await createProduct({ nameHe: "מכנסי לינן חום",     price: 189, categoryId: pants.id, images: ["/uploads/brown-linen-pants.jpeg"] });
  await createProduct({ nameHe: "מכנסי לינן לבן",     price: 189, categoryId: pants.id, images: ["/uploads/white-linen-pants.jpeg"] });
  await createProduct({ nameHe: "מכנסי חליפה קאקי",   price: 199, categoryId: pants.id, images: ["/uploads/khaki-dress-pants.jpeg"] });

  console.log("\n--- Shorts ---");
  await createProduct({ nameHe: "שורטס בז'",        price: 149, categoryId: shorts.id, images: ["/uploads/beige-sweat-shorts.jpeg"] });
  await createProduct({ nameHe: "שורטס ג'ינס כחול", price: 169, categoryId: shorts.id, images: ["/uploads/blue-jean-shorts.jpeg"] });
  await createProduct({ nameHe: "שורטס ג'ינס אפור", price: 169, categoryId: shorts.id, images: ["/uploads/gray-jean-shorts.jpeg"] });
  await createProduct({ nameHe: "שורטס חום",        price: 149, categoryId: shorts.id, images: ["/uploads/brown-sweat-shorts.jpeg"] });
  await createProduct({ nameHe: "שורטס אפור כהה",   price: 149, categoryId: shorts.id, images: ["/uploads/dark-gray-sweat-shorts.jpeg"] });
  await createProduct({ nameHe: "שורטס לבן",        price: 149, categoryId: shorts.id, images: ["/uploads/white-sweat-shorts.jpeg"] });

  console.log("\nAll done!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
