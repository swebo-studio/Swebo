import { prisma } from "@/lib/db";

export function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "SWEBO-";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function createCoupon(discountPct = 5, expiresAt?: Date): Promise<string> {
  let code = generateCode();
  for (let i = 0; i < 10; i++) {
    const existing = await prisma.coupon.findUnique({ where: { code } });
    if (!existing) break;
    code = generateCode();
  }
  await prisma.coupon.create({ data: { code, discountPct, expiresAt: expiresAt ?? null } });
  return code;
}

export async function validateCoupon(
  code: string
): Promise<{ valid: boolean; discountPct: number; id: string } | null> {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
  if (!coupon) return null;
  if (coupon.usedAt) return null;
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return null;
  return { valid: true, discountPct: coupon.discountPct, id: coupon.id };
}
