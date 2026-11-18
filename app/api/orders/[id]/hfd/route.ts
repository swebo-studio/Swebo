import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendOrderToHFD } from "@/lib/fulfillOrder";

type Ctx = { params: Promise<{ id: string }> };

const REASONS: Record<string, string> = {
  "not-found": "ההזמנה לא נמצאה",
  "not-paid": "ההזמנה עוד לא שולמה",
  preorder: "זו הזמנה מוקדמת — יש לשחרר אותה מעמודת ההזמנות המוקדמות",
  "no-delivery": "הזמנה באיסוף עצמי — אין מה לשלוח ל-HFD",
  "already-sent": "ההזמנה כבר נשלחה ל-HFD",
  "not-configured": "HFD לא מוגדר",
  failed: "HFD דחה את המשלוח",
};

/**
 * Admin: retry the HFD shipment of a paid order HFD refused the first time.
 * Preorders are refused here — they ship through their release.
 */
export async function POST(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const result = await sendOrderToHFD(id, { quiet: true });
  if (!result.ok) {
    const error = REASONS[result.reason] + (result.message ? ` ${result.message}` : "");
    return Response.json({ error }, { status: result.reason === "not-found" ? 404 : 400 });
  }
  const order = await prisma.order.findUnique({ where: { id }, select: { shipmentNumber: true, shipmentRandId: true } });
  return Response.json({ ok: true, ...order });
}
