import { NextRequest } from "next/server";
import { alertStalePendingOrders } from "@/lib/pendingOrders";

/**
 * Backstop for the stuck-order alert (see vercel.json crons). New orders and
 * payment redirects run the same check as they come in; this catches the
 * ones nothing else would, on a quiet night.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const alerted = await alertStalePendingOrders();
  return Response.json({ ok: true, alerted });
}
