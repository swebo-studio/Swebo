import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { dedupeSizeLabels, normalizeSizeLabel } from "@/lib/sizes";

type Ctx = { params: Promise<{ id: string; colorId: string }> };

/** Generous for shoes and waist/length grids, but bounded — the writes below
 *  run as one transaction and the labels come straight from a text box. */
const MAX_SIZES_PER_COLOR = 100;
const MAX_STOCK = 1_000_000;

function clampStock(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, MAX_STOCK);
}

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

  const { id, colorId } = await params;

  // The route took colorId on trust, so a wrong URL wrote sizes onto another
  // product's colour without complaint.
  const colour = await prisma.productColor.findFirst({ where: { id: colorId, productId: id } });
  if (!colour) return Response.json({ error: "Color not found on this product" }, { status: 404 });

  const body: unknown = await req.json();
  if (!Array.isArray(body)) return Response.json({ error: "Expected an array" }, { status: 400 });
  if (body.length > MAX_SIZES_PER_COLOR) {
    return Response.json({ error: `עד ${MAX_SIZES_PER_COLOR} מידות לצבע` }, { status: 400 });
  }

  const rawRows = body as { size?: unknown; stock?: unknown }[];

  // Labels are free-form ("M", "42", "34/32"), so clean them here rather than
  // matching a fixed list. Array order becomes the order customers see.
  const kept = dedupeSizeLabels(rawRows.map((r) => String(r?.size ?? "")));
  const rows = kept.map((size, sortOrder) => {
    const match = rawRows.find((r) => normalizeSizeLabel(String(r?.size ?? "")) === size);
    return { size, stock: clampStock(match?.stock), sortOrder };
  });

  const total = rows.reduce((s, r) => s + r.stock, 0);

  // One transaction: a half-written size list would misreport stock on the
  // storefront until the shop noticed and saved again.
  await prisma.$transaction([
    // Sizes dropped from the list. An empty list clears them all, which is the
    // admin saying "this colour has no size breakdown".
    prisma.productColorSize.deleteMany({
      where: { colorId, size: { notIn: rows.map((r) => r.size) } },
    }),
    ...rows.map(({ size, stock, sortOrder }) =>
      prisma.productColorSize.upsert({
        where: { colorId_size: { colorId, size } },
        update: { stock, sortOrder },
        create: { colorId, size, stock, sortOrder },
      })
    ),
    // Colour stock mirrors the per-size total. With no sizes left, leave the
    // colour's own figure alone — zeroing it there would make it unbuyable.
    ...(rows.length > 0
      ? [prisma.productColor.update({ where: { id: colorId }, data: { stock: total } })]
      : []),
  ]);

  return Response.json({ ok: true });
}
