import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createGrowPayment } from "@/lib/grow";

export async function POST(req: NextRequest) {
  const { orderId } = await req.json();
  const origin = req.headers.get("origin") ?? "http://localhost:3000";

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return Response.json({ error: "Order not found" }, { status: 404 });

  const result = await createGrowPayment({
    amount: order.total,
    orderId: order.id,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    successUrl: `${origin}/order/${order.id}?status=success`,
    failureUrl: `${origin}/checkout?status=failed`,
    notifyUrl: `${origin}/api/payment/notify`,
  });

  if (!result.success) {
    return Response.json({ error: result.error }, { status: 500 });
  }

  return Response.json({ paymentUrl: result.paymentUrl });
}
