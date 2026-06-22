import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
const adapter = new PrismaBetterSqlite3({ url: path.join(process.cwd(), "dev.db") });
const prisma = new PrismaClient({ adapter } as never);

async function main() {
  const products = await prisma.product.findMany({
    where: { categories: { none: {} } },
    include: { orderItems: true },
  });
  for (const p of products) {
    console.log(p.id, JSON.stringify(p.nameHe), "orderItems:", p.orderItems.length);
  }
}
main().finally(() => prisma.$disconnect());
