import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createHypayUrl } from "@/lib/hypay";

export async function POST(req: NextRequest) {
  const { orderId } = await req.json();
  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return Response.json({ error: "Order not found" }, { status: 404 });

  const paymentUrl = createHypayUrl({
    orderId:      order.id,
    amount:       order.total,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    // HYPay will append its transaction params to these URLs
    successUrl: `${origin}/api/payment/notify?orderId=${order.id}`,
    failureUrl: `${origin}/checkout?status=failed`,
  });

  if (!paymentUrl) {
    return Response.json({ error: "HYPay credentials not configured" }, { status: 500 });
  }

  return Response.json({ paymentUrl });
}
