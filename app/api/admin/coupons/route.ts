import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { generateCode } from "@/lib/coupon";
import { isFreeShippingScope } from "@/lib/shippingScope";
import { collabTotals } from "@/lib/collab";

/** Creator-code settings from a request body; undefined fields are left alone. */
function collabFields(body: { collab?: unknown; collabName?: unknown; collabPct?: unknown; collabPhone?: unknown }) {
  const pct = Number(body.collabPct);
  return {
    ...(body.collab !== undefined ? { collab: body.collab === true } : {}),
    ...(body.collabName !== undefined ? { collabName: String(body.collabName ?? "").trim() || null } : {}),
    ...(body.collabPct !== undefined ? { collabPct: Number.isFinite(pct) && pct > 0 ? Math.min(pct, 100) : null } : {}),
    ...(body.collabPhone !== undefined ? { collabPhone: String(body.collabPhone ?? "").replace(/[^\d+]/g, "") || null } : {}),
    // A creator's code is shared with a whole audience, so it never burns out on first use
    ...(body.collab === true ? { singleUse: false } : {}),
  };
}

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
  });
  const totals = await collabTotals(coupons.filter((c) => c.collab));
  return Response.json(coupons.map((c) => ({ ...c, collabTotals: totals.get(c.code) ?? null })));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const code = body.code?.trim().toUpperCase() || generateCode();
  // A free-shipping coupon carries no discount; a discount coupon no shipping scope
  const freeShipping = isFreeShippingScope(body.freeShipping) ? body.freeShipping : null;
  const discountAmount = !freeShipping && body.discountAmount ? Number(body.discountAmount) : null;
  const discountPct = freeShipping || discountAmount ? null : (Number(body.discountPct) || 10);
  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  const singleUse = body.singleUse !== false;

  const existing = await prisma.coupon.findUnique({ where: { code } });
  if (existing) return Response.json({ error: "קוד כבר קיים" }, { status: 400 });

  const coupon = await prisma.coupon.create({
    data: { code, discountPct, discountAmount, freeShipping, expiresAt, singleUse, ...collabFields(body) },
  });
  return Response.json(coupon, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  // A creator's sales and payouts are the record of what they are owed — keep them
  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (coupon) {
    const [orders, payouts] = await Promise.all([
      prisma.order.count({ where: { collabCode: coupon.code } }),
      prisma.collabPayout.count({ where: { couponId: id } }),
    ]);
    if (orders > 0 || payouts > 0) {
      return Response.json({ error: "לקוד יש היסטוריית מכירות ועמלות ולכן אי אפשר למחוק אותו. אפשר להגדיר לו תאריך תפוגה במקום." }, { status: 400 });
    }
  }
  await prisma.coupon.delete({ where: { id } });
  return Response.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, discountPct, discountAmount, freeShipping, expiresAt, resetUsed, singleUse } = body;
  const coupon = await prisma.coupon.update({
    where: { id },
    data: {
      ...(discountPct !== undefined ? { discountPct: discountPct ? Number(discountPct) : null } : {}),
      ...(discountAmount !== undefined ? { discountAmount: discountAmount ? Number(discountAmount) : null } : {}),
      ...(expiresAt !== undefined ? { expiresAt: expiresAt ? new Date(expiresAt) : null } : {}),
      ...(freeShipping !== undefined ? { freeShipping: isFreeShippingScope(freeShipping) ? freeShipping : null } : {}),
      ...(singleUse !== undefined ? { singleUse } : {}),
      ...(resetUsed ? { usedAt: null, usedByEmail: null } : {}),
      ...collabFields(body),
    },
  });
  return Response.json(coupon);
}
