import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string; colorId: string }> };

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { colorId } = await params;
  const { nameHe, hex, stock, imageUrl } = await req.json();
  const color = await prisma.productColor.update({
    where: { id: colorId },
    data: { nameHe, hex, stock, imageUrl: imageUrl ?? null },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });
  return Response.json(color);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { colorId } = await params;
  await prisma.productColor.delete({ where: { id: colorId } });
  return Response.json({ success: true });
}
