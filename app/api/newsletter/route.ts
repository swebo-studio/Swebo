import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { generateCode } from "@/lib/coupon";
import { sendSMS, addContact } from "@/lib/notify";

export async function POST(req: NextRequest) {
  const { phone } = await req.json();
  if (!phone) return Response.json({ error: "נדרש מספר טלפון" }, { status: 400 });

  // Generate unique coupon code
  let code = generateCode();
  for (let i = 0; i < 10; i++) {
    const existing = await prisma.newsletter.findUnique({ where: { couponCode: code } });
    if (!existing) break;
    code = generateCode();
  }

  // Also create a Coupon record so it can be used at checkout
  await prisma.coupon.create({ data: { code, discountPct: 5 } });

  await prisma.newsletter.create({ data: { phone, couponCode: code } });

  // Add contact to ActiveTrail list (fire and forget)
  addContact({ phone }).catch(() => {});

  // Send the coupon by SMS
  await sendSMS(
    phone,
    `ברוך הבא למשפחת SWEBO! קוד הקופון שלך ל-5% הנחה על ההזמנה הראשונה: ${code}`
  );

  return Response.json({ code });
}
