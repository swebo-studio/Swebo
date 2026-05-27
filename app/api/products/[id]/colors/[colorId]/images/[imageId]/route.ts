import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string; colorId: string; imageId: string }> };

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id, colorId, imageId } = await params;

  await prisma.productColorImage.delete({ where: { id: imageId } });

  // Recalculate display image: first image of first color
  const firstColor = await prisma.productColor.findFirst({
    where: { productId: id },
    orderBy: { sortOrder: "asc" },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });
  const displayImage = firstColor?.images[0]?.url ?? "";
  await prisma.product.update({ where: { id }, data: { image: displayImage } });

  return Response.json({ success: true });
}
