import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const SIZES = ["S", "M", "L", "XL"];
type Ctx = { params: Promise<{ id: string; colorId: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { colorId } = await params;
  const sizes = await prisma.productColorSize.findMany({ where: { colorId } });
  // Return full set with 0 defaults
  const map = Object.fromEntries(sizes.map((s) => [s.size, s.stock]));
  return Response.json(SIZES.map((size) => ({ size, stock: map[size] ?? 0 })));
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { colorId } = await params;
  const body: { size: string; stock: number }[] = await req.json();

  await Promise.all(
    body.map(({ size, stock }) =>
      prisma.productColorSize.upsert({
        where: { colorId_size: { colorId, size } },
        update: { stock },
        create: { colorId, size, stock },
      })
    )
  );

  // Update ProductColor.stock to be the sum
  const total = body.reduce((s, r) => s + r.stock, 0);
  await prisma.productColor.update({ where: { id: colorId }, data: { stock: total } });

  return Response.json({ ok: true });
}
