import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const products = await prisma.product.findMany({
    select: { id: true, nameHe: true, price: true },
    orderBy: { nameHe: "asc" },
  });
  return Response.json(products);
}
