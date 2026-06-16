import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createHypayRedirectUrl } from "@/lib/hypay";

export async function POST(req: NextRequest) {
  const { orderId } = await req.json();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? req.headers.get("origin") ?? "http://localhost:3000";

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return Response.json({ error: "Order not found" }, { status: 404 });

  const redirectUrl = await createHypayRedirectUrl({
    orderId:       order.id,
    amount:        order.total,
    customerName:  order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    successUrl:    `${origin}/api/payment/notify?orderId=${order.id}`,
    failureUrl:    `${origin}/checkout?status=failed`,
  });

  if (!redirectUrl) {
    return Response.json({ error: "HYPay credentials not configured or signing failed" }, { status: 500 });
  }

  return Response.json({ redirectUrl });
}
