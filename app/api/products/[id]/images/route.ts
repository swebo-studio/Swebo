import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const images = await prisma.productImage.findMany({
    where: { productId: id },
    orderBy: { sortOrder: "asc" },
  });
  return Response.json(images);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { url } = await req.json();

  const count = await prisma.productImage.count({ where: { productId: id } });
  const image = await prisma.productImage.create({
    data: { productId: id, url, sortOrder: count },
  });
  return Response.json(image, { status: 201 });
}
