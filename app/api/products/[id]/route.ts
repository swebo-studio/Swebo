import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      categories: true,
      images: { orderBy: { sortOrder: "asc" } },
      colors: {
        orderBy: { sortOrder: "asc" },
        include: { images: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
  if (!product) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(product);
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const categoryIds: string[] = body.categoryIds ?? (body.categoryId ? [body.categoryId] : []);
  const product = await prisma.product.update({
    where: { id },
    data: {
      nameHe: body.nameHe,
      descriptionHe: body.descriptionHe,
      detailsHe: body.detailsHe,
      price: body.price,
      comparePrice: body.comparePrice ?? null,
      stock: body.stock,
      image: body.image,
      active: body.active,
      sizeGuideImages: body.sizeGuideImages !== undefined ? body.sizeGuideImages : undefined,
      categories: { set: categoryIds.map((cid) => ({ id: cid })) },
    },
    include: { categories: true },
  });
  return Response.json(product);
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const product = await prisma.product.update({
    where: { id },
    data: { ...(body.active !== undefined && { active: body.active }) },
  });
  return Response.json(product);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  // Remove order item references first (no cascade on OrderItem → Product)
  await prisma.orderItem.deleteMany({ where: { productId: id } });
  await prisma.product.delete({ where: { id } });
  return Response.json({ success: true });
}
