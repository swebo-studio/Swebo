import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { collabTotals } from "@/lib/collab";

type Params = { params: Promise<{ id: string }> };

/** A creator code's totals, its paid orders and the payouts made against it. */
async function collabReport(id: string) {
  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon) return null;
  const [totals, orders, payouts] = await Promise.all([
    collabTotals([coupon]),
    prisma.order.findMany({
      where: { collabCode: coupon.code, status: "paid" },
      select: { id: true, customerName: true, subtotal: true, collabCommission: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.collabPayout.findMany({ where: { couponId: id }, orderBy: { createdAt: "desc" } }),
  ]);
  return { totals: totals.get(coupon.code)!, orders, payouts };
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const report = await collabReport((await params).id);
  if (!report) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(report);
}

/** Record a payout to the creator: `{ amount }`, or `{ all: true }` for the whole balance due. */
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // Locking the coupon row makes payouts for one code take turns, so two
  // clicks on "mark all paid" cannot both pay the same balance.
  const error = await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ id: string; code: string }[]>`SELECT id, code FROM "Coupon" WHERE id = ${id} FOR UPDATE`;
    if (locked.length === 0) return "Not found";
    const { due } = (await collabTotals(locked, tx)).get(locked[0].code)!;
    const amount = body.all === true ? due : Math.round(Number(body.amount) * 100) / 100;
    if (due <= 0) return "אין יתרה פתוחה לתשלום";
    if (!Number.isFinite(amount) || amount <= 0) return "סכום לא תקין";
    if (amount > due) return `הסכום גבוה מהיתרה לתשלום (₪${due})`;
    await tx.collabPayout.create({ data: { couponId: id, amount } });
    return null;
  });
  if (error) return Response.json({ error }, { status: error === "Not found" ? 404 : 400 });
  return Response.json(await collabReport(id), { status: 201 });
}

/** Undo a payout recorded by mistake: `{ payoutId }`. */
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { payoutId } = await req.json();
  // Without an id the filter would match every payout of the code
  if (typeof payoutId !== "string" || !payoutId) return Response.json({ error: "Missing payoutId" }, { status: 400 });
  await prisma.collabPayout.deleteMany({ where: { id: payoutId, couponId: id } });
  const report = await collabReport(id);
  if (!report) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(report);
}
