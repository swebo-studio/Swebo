import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { dedupeSizeLabels, normalizeSizeLabel } from "@/lib/sizes";

type Ctx = { params: Promise<{ id: string; colorId: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { colorId } = await params;
  const sizes = await prisma.productColorSize.findMany({
    where: { colorId },
    orderBy: [{ sortOrder: "asc" }, { size: "asc" }],
  });
  return Response.json(sizes.map((s) => ({ size: s.size, stock: s.stock })));
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { colorId } = await params;
  const body: { size: string; stock: number }[] = await req.json();
  if (!Array.isArray(body)) return Response.json({ error: "Expected an array" }, { status: 400 });

  // Labels are free-form ("M", "42", "34/32"), so clean them here rather than
  // matching a fixed list. Array order becomes the order customers see.
  const kept = dedupeSizeLabels(body.map((r) => r?.size ?? ""));
  const rows = kept.map((size, sortOrder) => {
    const match = body.find((r) => normalizeSizeLabel(r?.size ?? "") === size);
    const stock = Math.max(0, Math.round(Number(match?.stock ?? 0)) || 0);
    return { size, stock, sortOrder };
  });

  // Delete sizes no longer in the list
  await prisma.productColorSize.deleteMany({
    where: { colorId, size: { notIn: rows.map((r) => r.size) } },
  });
  await Promise.all(
    rows.map(({ size, stock, sortOrder }) =>
      prisma.productColorSize.upsert({
        where: { colorId_size: { colorId, size } },
        update: { stock, sortOrder },
        create: { colorId, size, stock, sortOrder },
      })
    )
  );

  // Colour stock mirrors the per-size total. Clearing every size instead means
  // "this colour has no size breakdown", so leave its own stock figure alone —
  // zeroing it there would make the colour unbuyable.
  if (rows.length > 0) {
    const total = rows.reduce((s, r) => s + r.stock, 0);
    await prisma.productColor.update({ where: { id: colorId }, data: { stock: total } });
  }

  return Response.json({ ok: true });
}
