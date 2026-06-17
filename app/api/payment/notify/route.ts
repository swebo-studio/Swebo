import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyHypayTransaction } from "@/lib/hypay";
import { notifyOrderConfirmation } from "@/lib/notify";

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

  // Verify with HYPay's APISign endpoint
  const verified = await verifyHypayTransaction(params);

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status:    verified ? "paid" : "failed",
      paymentId: transactionId ?? null,
    },
  });

  if (verified) {
    // Send "thank you for your order" email (fire and forget)
    prisma.order
      .findUnique({
        where: { id: orderId },
        include: { items: { include: { product: true } } },
      })
      .then((order) => {
        if (!order) return;
        return notifyOrderConfirmation({
          id: order.id,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          total: order.total,
          items: order.items.map((it) => ({
            nameHe: it.product.nameHe,
            quantity: it.quantity,
            size: it.size,
            color: it.color,
            price: it.price,
          })),
        });
      })
      .catch((e) => console.error("[Order confirmation email] failed:", e));

    return Response.redirect(`${origin}/order/${orderId}?status=success`);
  } else {
    return Response.redirect(`${origin}/checkout?status=failed`);
  }
}
