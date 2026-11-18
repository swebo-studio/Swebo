import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { productBadgeInput } from "@/lib/promotionBadges";
import { preorderInput } from "@/lib/preorder";

/** A product's own care image: a URL, or null for the store-wide one. Undefined leaves it. */
function careImageInput(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

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
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          sizes: { orderBy: [{ sortOrder: "asc" }, { size: "asc" }] },
        },
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
  const preorder = preorderInput(body);
  if (!preorder.ok) return Response.json({ error: preorder.error }, { status: 400 });
  const product = await prisma.product.update({
    where: { id },
    data: {
      nameHe: body.nameHe,
      ...preorder.data,
      descriptionHe: body.descriptionHe,
      detailsHe: body.detailsHe,
      price: body.price,
      comparePrice: body.comparePrice ?? null,
      stock: body.stock,
      image: body.image,
      active: body.active,
      sizeGuideImages: body.sizeGuideImages !== undefined ? body.sizeGuideImages : undefined,
      showSizeChart: body.showSizeChart !== undefined ? body.showSizeChart : undefined,
      careImage: careImageInput(body.careImage),
      ...productBadgeInput(body),
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
    data: {
      ...(body.active !== undefined && { active: body.active }),
      ...(body.sizeGuideImages !== undefined && { sizeGuideImages: body.sizeGuideImages }),
      ...(body.showSizeChart !== undefined && { showSizeChart: body.showSizeChart }),
      ...(body.careImage !== undefined && { careImage: careImageInput(body.careImage) }),
    },
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
