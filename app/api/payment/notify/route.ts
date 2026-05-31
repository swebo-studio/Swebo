import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyHypayTransaction } from "@/lib/hypay";

/**
 * HYPay redirects the customer's browser to this URL after payment.
 * All transaction params are appended as query string by HYPay.
 * We verify the transaction, update the order, then redirect the user.
 */
export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const orderId = params["orderId"];
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
    return Response.redirect(`${origin}/order/${orderId}?status=success`);
  } else {
    return Response.redirect(`${origin}/checkout?status=failed`);
  }
}
