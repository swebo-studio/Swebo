import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { code } = await req.json();
  if (!code) return Response.json({ valid: false, error: "קוד ריק" });

  const coupon = await prisma.coupon.findUnique({ where: { code: (code as string).toUpperCase() } });
  if (!coupon) return Response.json({ valid: false, error: "קוד לא תקין" });
  if (coupon.singleUse && coupon.usedAt) return Response.json({ valid: false, error: "קוד כבר נוצל" });
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return Response.json({ valid: false, error: "קוד פג תוקף" });

  return Response.json({ valid: true, discountPct: coupon.discountPct });
}
