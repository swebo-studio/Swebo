import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { sendSMS } from "@/lib/notify";

const CODE_VALIDITY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;

export async function POST(req: NextRequest) {
  const { phone: rawPhone } = await req.json();
  const phone = String(rawPhone || "").replace(/\D/g, "").replace(/^972/, "0");
  if (!phone) return Response.json({ error: "נדרש מספר טלפון" }, { status: 400 });

  const adminPhoneEnv = process.env.ADMIN_PHONE?.replace(/\D/g, "").replace(/^972/, "0");
  const allowed = phone === adminPhoneEnv || (await prisma.adminPhone.findUnique({ where: { phone } }));
  if (!allowed) {
    return Response.json({ error: "מספר טלפון לא מורשה" }, { status: 403 });
  }

  const existing = await prisma.adminOtp.findUnique({ where: { phone } });
  if (existing && existing.createdAt.getTime() > Date.now() - RESEND_COOLDOWN_SECONDS * 1000) {
    return Response.json({ error: "קוד כבר נשלח, נסה שוב בעוד רגע" }, { status: 429 });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + CODE_VALIDITY_MINUTES * 60 * 1000);

  await prisma.adminOtp.upsert({
    where: { phone },
    update: { code, expiresAt, createdAt: new Date() },
    create: { phone, code, expiresAt },
  });

  await sendSMS(phone, `קוד הכניסה שלך לניהול SWEBO: ${code}. בתוקף ל-${CODE_VALIDITY_MINUTES} דקות.`);

  return Response.json({ ok: true });
}
