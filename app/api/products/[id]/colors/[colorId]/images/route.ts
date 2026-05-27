import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string; colorId: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id, colorId } = await params;
  const { url } = await req.json();

  const count = await prisma.productColorImage.count({ where: { colorId } });
  const image = await prisma.productColorImage.create({
    data: { colorId, url, sortOrder: count },
  });

  // If this is the very first image of the first color, set it as the product display image
  const color = await prisma.productColor.findUnique({ where: { id: colorId } });
  if (color && count === 0) {
    const firstColor = await prisma.productColor.findFirst({
      where: { productId: id },
      orderBy: { sortOrder: "asc" },
    });
    if (firstColor?.id === colorId) {
      await prisma.product.update({ where: { id }, data: { image: url } });
    }
  }

  return Response.json(image, { status: 201 });
}
