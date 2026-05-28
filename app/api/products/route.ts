import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: { categories: true },
  });
  return Response.json(products);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const categoryIds: string[] = body.categoryIds ?? (body.categoryId ? [body.categoryId] : []);
  const product = await prisma.product.create({
    data: {
      nameHe: body.nameHe,
      descriptionHe: body.descriptionHe ?? "",
      price: body.price ?? 150,
      stock: body.stock ?? 0,
      image: body.image ?? "",
      active: body.active ?? true,
      categories: categoryIds.length ? { connect: categoryIds.map((id) => ({ id })) } : undefined,
    },
    include: { categories: true },
  });
  return Response.json(product, { status: 201 });
}
