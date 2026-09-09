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
  const { nameHe, sortOrder } = await req.json();
  const category = await prisma.category.create({ data: { nameHe, sortOrder: sortOrder ?? 0 } });
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
