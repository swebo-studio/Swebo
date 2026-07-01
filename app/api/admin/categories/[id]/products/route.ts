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
  await Promise.all(
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
