import { prisma } from "@/lib/db";
import { notifyAdmin } from "@/lib/notify";

/** How long an order may wait for its payment redirect before the admins hear about it. */
const STALE_AFTER_MS = 15 * 60 * 1000;
/** Older orders are left alone, so the first run does not text the whole backlog. */
const LOOK_BACK_MS = 24 * 60 * 60 * 1000;

/**
 * Texts the admins about orders still "pending" 15 minutes after checkout.
 * Hyp only reports a payment through the customer's browser coming back to
 * /api/payment/notify; a customer who closes the tab, or a wallet app that
 * doesn't hand back, leaves a charged order pending with no SMS, stock or
 * HFD shipment. Each order is reported once — the claim on pendingAlertAt
 * keeps two concurrent runs from texting it twice.
 */
export async function alertStalePendingOrders(): Promise<number> {
  const now = Date.now();
  const candidates = await prisma.order.findMany({
    where: {
      status: "pending",
      pendingAlertAt: null,
      createdAt: { lte: new Date(now - STALE_AFTER_MS), gte: new Date(now - LOOK_BACK_MS) },
    },
    orderBy: { createdAt: "asc" },
  });

  const claimed: typeof candidates = [];
  for (const order of candidates) {
    const { count } = await prisma.order.updateMany({
      where: { id: order.id, status: "pending", pendingAlertAt: null },
      data: { pendingAlertAt: new Date() },
    });
    if (count > 0) claimed.push(order);
  }
  // One text per order, so each carries its own ready-to-send customer message
  for (const order of claimed) {
    await notifyAdmin("הזמנה ממתינה לתשלום", pendingOrderAdminMessage(order)).catch((e) =>
      console.error("[Pending alert] SMS failed:", order.id, e)
    );
  }
  return claimed.length;
}

/**
 * The admin's alert for one stuck order: who to call, what to check, and a
 * fixed message below the line to copy and send the customer as is.
 */
export function pendingOrderAdminMessage(order: { id: string; customerName: string; customerPhone: string; total: number }): string {
  const ref = order.id.slice(-6).toUpperCase();
  const firstName = order.customerName.trim().split(/\s+/)[0] || order.customerName;
  return [
    `הזמנה #${ref} ממתינה לתשלום כבר 15 דקות.`,
    `לקוח: ${order.customerName}`,
    `טלפון: ${order.customerPhone}`,
    `סכום: ₪${order.total}`,
    `יש לבדוק ב-Hyp. אם חויב — לסמן "שולם" בניהול ההזמנות.`,
    ``,
    `נוסח ללקוח:`,
    `היי ${firstName}, כאן SWEBO 👋 ראינו שההזמנה שלך (#${ref}) לא הושלמה באתר. אם כבר חויבת — אל דאגה, ההזמנה אצלנו ואנחנו מטפלים בה. אם לא — אפשר לענות לנו כאן ונעזור לך להשלים אותה. תודה!`,
  ].join("\n");
}
