import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const colors = await prisma.productColor.findMany({
    where: { productId: id },
    orderBy: { sortOrder: "asc" },
  });
  return Response.json(colors);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { nameHe, hex, stock, imageUrl } = await req.json();

  const count = await prisma.productColor.count({ where: { productId: id } });
  const color = await prisma.productColor.create({
    data: { productId: id, nameHe, hex: hex ?? "#000000", stock: stock ?? 0, sortOrder: count, imageUrl: imageUrl ?? null },
  });
  return Response.json(color, { status: 201 });
}
