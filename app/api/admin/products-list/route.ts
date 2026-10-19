import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const products = await prisma.product.findMany({
    select: {
      id: true, nameHe: true, price: true, image: true, active: true,
      colors: { orderBy: { sortOrder: "asc" }, take: 1, select: { images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } } } },
    },
    orderBy: { nameHe: "asc" },
  });
  // The same picture the storefront card shows: the first color's first image, else the product's own
  return Response.json(products.map(({ colors, ...p }) => ({ ...p, image: colors[0]?.images[0]?.url || p.image })));
}
