import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [products, orders] = await Promise.all([
    prisma.product.findMany({
      where: { categories: { some: { id } } },
      select: { id: true, nameHe: true, image: true, active: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.categoryProductOrder.findMany({ where: { categoryId: id } }),
  ]);

  const orderMap = new Map(orders.map((o) => [o.productId, o.sortOrder]));
  const sorted = [...products].sort((a, b) => {
    const aOrder = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const bOrder = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  return NextResponse.json(sorted.map((p) => ({ id: p.id, nameHe: p.nameHe, image: p.image, active: p.active })));
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  // Expects: [{ productId, sortOrder }, ...] — full ordered list for this category
  const updates: { productId: string; sortOrder: number }[] = await req.json();
  await prisma.$transaction(
    updates.map(({ productId, sortOrder }) =>
      prisma.categoryProductOrder.upsert({
        where: { categoryId_productId: { categoryId: id, productId } },
        update: { sortOrder },
        create: { categoryId: id, productId, sortOrder },
      })
    )
  );
  return NextResponse.json({ ok: true });
}

/**
 * Sets exactly which products are in this category. Products that stay keep
 * their place, products that join go to the end, products that leave lose theirs.
 */
export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { productIds } = await req.json();
  if (!Array.isArray(productIds)) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const ids = [...new Set(productIds.filter((p): p is string => typeof p === "string"))];

  // The order the admin sees now. Products put in from the product page have
  // no saved place yet and sit at the end by age, exactly as GET shows them,
  // so the whole order is written out — otherwise a newcomer with a saved
  // place would jump ahead of them.
  const [members, orders] = await Promise.all([
    prisma.product.findMany({ where: { categories: { some: { id } } }, select: { id: true, createdAt: true } }),
    prisma.categoryProductOrder.findMany({ where: { categoryId: id } }),
  ]);
  const orderMap = new Map(orders.map((o) => [o.productId, o.sortOrder]));
  const current = members
    .sort((a, b) => (orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER) || a.createdAt.getTime() - b.createdAt.getTime())
    .map((p) => p.id);
  const wanted = new Set(ids);
  const finalOrder = [...current.filter((pid) => wanted.has(pid)), ...ids.filter((pid) => !current.includes(pid))];

  // One transaction, so the category can never be left half-updated
  await prisma.$transaction([
    prisma.category.update({ where: { id }, data: { products: { set: ids.map((pid) => ({ id: pid })) } } }),
    prisma.categoryProductOrder.deleteMany({ where: { categoryId: id } }),
    prisma.categoryProductOrder.createMany({ data: finalOrder.map((productId, sortOrder) => ({ categoryId: id, productId, sortOrder })) }),
  ]);
  return NextResponse.json({ ok: true });
}
