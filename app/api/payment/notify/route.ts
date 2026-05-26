import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

// GROW webhook — called by GROW when payment completes
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { order_id, transaction_id, status } = body;

  if (!order_id) return Response.json({ ok: false });

  await prisma.order.update({
    where: { id: order_id },
    data: {
      status: status === "approved" ? "paid" : "failed",
      paymentId: transaction_id ?? null,
    },
  });

  return Response.json({ ok: true });
}
