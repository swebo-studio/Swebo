import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { generateCode } from "@/lib/coupon";
import { sendSMS, addContact } from "@/lib/notify";

const COUPON_VALIDITY_HOURS = 60;

export async function POST(req: NextRequest) {
  const { phone } = await req.json();
  if (!phone) return Response.json({ error: "נדרש מספר טלפון" }, { status: 400 });

  // Only one coupon per phone number, ever
  const existingSignup = await prisma.newsletter.findUnique({ where: { phone } });
  if (existingSignup) {
    return Response.json({ error: "כבר נוצל קופון עבור מספר טלפון זה" }, { status: 409 });
  }

  // Generate unique coupon code
  let code = generateCode();
  for (let i = 0; i < 10; i++) {
    const existing = await prisma.newsletter.findUnique({ where: { couponCode: code } });
    if (!existing) break;
    code = generateCode();
  }

  const expiresAt = new Date(Date.now() + COUPON_VALIDITY_HOURS * 60 * 60 * 1000);

  // Also create a Coupon record so it can be used at checkout
  await prisma.coupon.create({ data: { code, discountPct: 5, expiresAt } });

  await prisma.newsletter.create({ data: { phone, couponCode: code } });

  // Add contact to ActiveTrail list (fire and forget)
  addContact({ phone }).catch(() => {});

  // Send the coupon by SMS
  await sendSMS(
    phone,
    `ברוך הבא למשפחת SWEBO! קוד הקופון שלך ל-5% הנחה על ההזמנה הראשונה: ${code}. בתוקף ל-60 שעות.`
  );

  return Response.json({ code });
}
