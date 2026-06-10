import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { generateCode } from "@/lib/coupon";
import { notifyCustomerEmail, addContact } from "@/lib/notify";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return Response.json({ error: "נדרש אימייל" }, { status: 400 });

  // Generate unique coupon code
  let code = generateCode();
  for (let i = 0; i < 10; i++) {
    const existing = await prisma.newsletter.findUnique({ where: { couponCode: code } });
    if (!existing) break;
    code = generateCode();
  }

  // Also create a Coupon record so it can be used at checkout
  await prisma.coupon.create({ data: { code, discountPct: 5 } });

  await prisma.newsletter.create({ data: { email, couponCode: code } });

  // Add contact to ActiveTrail list (fire and forget)
  addContact({ email }).catch(() => {});

  // Send the coupon by email
  await notifyCustomerEmail(
    email,
    "הקופון שלך מ-SWEBO – 5% הנחה!",
    `<div dir="rtl" style="font-family:sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#1A1A1A">ברוך הבא למשפחת SWEBO</h2>
      <p>קוד הקופון שלך לקבלת <strong>5% הנחה</strong> על הזמנתך הראשונה:</p>
      <div style="font-size:2rem;font-weight:bold;letter-spacing:4px;background:#F5F0E8;padding:16px;border-radius:12px;text-align:center">${code}</div>
      <p style="color:#6B6B6B;font-size:0.9rem">הזן את הקוד בעגלת הקניות לפני התשלום.</p>
    </div>`
  );

  return Response.json({ code });
}
