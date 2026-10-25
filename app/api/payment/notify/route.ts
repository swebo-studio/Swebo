import { NextRequest, after } from "next/server";
import { prisma } from "@/lib/db";
import { verifyHypayTransaction } from "@/lib/hypay";
import { claimPaid, fulfillPaidOrder } from "@/lib/fulfillOrder";
import { alertStalePendingOrders } from "@/lib/pendingOrders";
import { notifyAdmin } from "@/lib/notify";

/**
 * HYPay redirects the customer's browser to this URL after payment.
 * All transaction params are appended as query string by HYPay.
 * We verify the transaction, update the order, then redirect the user.
 */
export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  // orderId comes from our dynamic SuccessUrl param; fall back to HYPay's Order field
  const orderId = params["orderId"] || params["Order"];
  const transactionId = params["Id"];
  const origin = req.nextUrl.origin;

  if (!orderId) {
    return Response.redirect(`${origin}/checkout?status=failed`);
  }

  // Every payment return also looks for other orders still stuck unpaid
  after(() => alertStalePendingOrders().catch((e) => console.error("[Pending alert] failed:", e)));

  // Verify with HYPay's APISign endpoint
  const verified = await verifyHypayTransaction(params);

  // A real payment that is not this order's (a replayed return URL — or Hyp
  // leaving a field out) neither confirms the order nor fails it: it stays
  // pending, and the admins check it in Hyp.
  if (verified && !(await paymentMatchesOrder(params, orderId))) {
    await notifyAdmin("תשלום לא תואם", `הזמנה #${orderId.slice(-6).toUpperCase()} — התקבל אישור תשלום שלא תואם להזמנה (מספר הזמנה או סכום). ההזמנה נשארה ממתינה — יש לבדוק ב-Hyp לפני שמסמנים "שולם".`).catch(() => {});
    return Response.redirect(`${origin}/order/${orderId}`);
  }

  if (verified) {
    // Only the first confirmation of an order runs the side effects — a
    // reload or replay of this URL must not ship or text it again.
    const claimed = await claimPaid(orderId, transactionId);
    // Run post-payment side effects via after() so the platform keeps this
    // function alive until they finish, instead of risking termination
    // right after the redirect response below is sent (which silently
    // killed slower chains — e.g. multi-item orders or the HFD step that
    // runs last — before SMS/HFD ever fired).
    if (claimed) {
      after(() => fulfillPaidOrder(orderId).catch((e) =>
        console.error("[Post-payment] fulfillment failed:", orderId, e)
      ));
    }
    return Response.redirect(`${origin}/order/${orderId}?status=success`);
  }

  // Never downgrade an order that is already paid (e.g. a stale or replayed URL)
  await prisma.order.updateMany({
    where: { id: orderId, status: { not: "paid" } },
    data: { status: "failed", paymentId: transactionId ?? null },
  });
  return Response.redirect(`${origin}/checkout?status=failed`);
}

/**
 * A verified payment proves only that *some* transaction went through. Our
 * own ?orderId= is not among the fields Hyp signs, so without this a ₪1
 * payment's return URL could be replayed with other orders' ids. The signed
 * Order and Amount must be this order's — the same values /api/payment
 * signed when it sent the customer to pay.
 */
async function paymentMatchesOrder(params: Record<string, string>, orderId: string): Promise<boolean> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { total: true } });
  if (!order) return false;
  const matches = params["Order"] === orderId && Number(params["Amount"]) === Math.round(order.total);
  if (!matches) {
    console.error("[HYPay] verified payment does not match order:", orderId, { Order: params["Order"], Amount: params["Amount"], total: order.total });
  }
  return matches;
}
