import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { sendSMS } from "@/lib/notify";

/**
 * Runs periodically (see vercel.json crons).
 * Sends a reminder SMS to anyone who signed up for the 5% newsletter coupon
 * more than 24h ago, hasn't used it yet, and hasn't already received a reminder.
 * Coupons themselves expire after 60h (set at creation in /api/newsletter).
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const reminderCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const candidates = await prisma.newsletter.findMany({
    where: {
      phone: { not: null },
      usedAt: null,
      reminderSentAt: null,
      createdAt: { lte: reminderCutoff },
    },
  });

  let sent = 0;
  for (const signup of candidates) {
    if (!signup.phone) continue;

    // Skip if the coupon already expired or was used (in case usedAt wasn't set on Newsletter)
    const coupon = await prisma.coupon.findUnique({ where: { code: signup.couponCode } });
    if (!coupon || coupon.usedAt || (coupon.expiresAt && coupon.expiresAt < now)) {
      await prisma.newsletter.update({ where: { id: signup.id }, data: { reminderSentAt: now } });
      continue;
    }

    const ok = await sendSMS(
      signup.phone,
      `תזכורת מ-SWEBO: עדיין לא ניצלת את קופון ה-5% שלך (${signup.couponCode})! הקופון בתוקף ל-36 שעות נוספות בלבד.`
    );

    await prisma.newsletter.update({ where: { id: signup.id }, data: { reminderSentAt: now } });
    if (ok) sent++;
  }

  return Response.json({ checked: candidates.length, sent });
}
