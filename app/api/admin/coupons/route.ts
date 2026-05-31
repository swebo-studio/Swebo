import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { generateCode } from "@/lib/coupon";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
  });
  return Response.json(coupons);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const code = body.code?.trim().toUpperCase() || generateCode();
  const discountPct = Number(body.discountPct) || 10;
  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  const singleUse = body.singleUse !== false;

  // Check for duplicate
  const existing = await prisma.coupon.findUnique({ where: { code } });
  if (existing) return Response.json({ error: "קוד כבר קיים" }, { status: 400 });

  const coupon = await prisma.coupon.create({
    data: { code, discountPct, expiresAt, singleUse },
  });
  return Response.json(coupon, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  await prisma.coupon.delete({ where: { id } });
  return Response.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id, discountPct, expiresAt, resetUsed, singleUse } = await req.json();
  const coupon = await prisma.coupon.update({
    where: { id },
    data: {
      ...(discountPct !== undefined ? { discountPct: Number(discountPct) } : {}),
      ...(expiresAt !== undefined ? { expiresAt: expiresAt ? new Date(expiresAt) : null } : {}),
      ...(singleUse !== undefined ? { singleUse } : {}),
      ...(resetUsed ? { usedAt: null, usedByEmail: null } : {}),
    },
  });
  return Response.json(coupon);
}
