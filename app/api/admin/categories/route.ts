import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // id breaks ties so the admin list and the storefront agree even if two
  // categories ended up sharing a sortOrder.
  const categories = await prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { nameHe, sortOrder, productIds } = await req.json();
  // Optional: the products to start with, in the order given
  const ids: string[] = Array.isArray(productIds) ? [...new Set(productIds.filter((p: unknown): p is string => typeof p === "string"))] : [];
  const category = await prisma.category.create({
    data: {
      nameHe,
      sortOrder: sortOrder ?? 0,
      products: { connect: ids.map((id) => ({ id })) },
      productOrders: { create: ids.map((productId, i) => ({ productId, sortOrder: i })) },
    },
  });
  return NextResponse.json(category);
}

/** Renames one category. */
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, nameHe } = await req.json();
  const name = typeof nameHe === "string" ? nameHe.trim() : "";
  if (!id || !name) return NextResponse.json({ error: "חסר שם לקטגוריה" }, { status: 400 });
  const category = await prisma.category.update({ where: { id }, data: { nameHe: name } });
  return NextResponse.json(category);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Expects: [{ id, sortOrder }, ...]
  const updates: { id: string; sortOrder: number }[] = await req.json();
  // One transaction, so a half-applied order can never be left behind.
  await prisma.$transaction(
    updates.map(({ id, sortOrder }) =>
      prisma.category.update({ where: { id }, data: { sortOrder } })
    )
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  // disconnect all products from this category, then delete it
  await prisma.category.update({ where: { id }, data: { products: { set: [] } } });
  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
