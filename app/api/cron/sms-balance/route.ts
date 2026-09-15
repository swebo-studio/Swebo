import { NextRequest } from "next/server";
import { checkSmsBalance } from "@/lib/notify";

/**
 * Daily backstop for the low-balance alert (see vercel.json crons). Paid
 * orders check the balance themselves; this catches credits spent elsewhere —
 * newsletter coupons, reminders, admin login codes, stage updates.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  await checkSmsBalance();
  return Response.json({ ok: true });
}
