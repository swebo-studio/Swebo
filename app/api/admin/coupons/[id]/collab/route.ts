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
  const before = await collabReport(id);
  if (!before) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const amount = body.all === true ? before.totals.due : Math.round(Number(body.amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) {
    return Response.json({ error: body.all ? "אין יתרה פתוחה לתשלום" : "סכום לא תקין" }, { status: 400 });
  }

  await prisma.collabPayout.create({ data: { couponId: id, amount } });
  return Response.json(await collabReport(id), { status: 201 });
}

/** Undo a payout recorded by mistake: `{ payoutId }`. */
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { payoutId } = await req.json();
  await prisma.collabPayout.deleteMany({ where: { id: payoutId, couponId: id } });
  const report = await collabReport(id);
  if (!report) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(report);
}
