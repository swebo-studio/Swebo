import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL_UNPOOLED! });
const prisma = new PrismaClient({ adapter } as never);

async function main() {
  const username = process.argv[2] || "admin";
  const password = process.argv[3] || "swebo2024";

  const hash = await bcrypt.hash(password, 10);

  await prisma.admin.upsert({
    where: { username },
    update: { password: hash },
    create: { username, password: hash },
  });

  console.log(`Admin "${username}" created/updated successfully.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
