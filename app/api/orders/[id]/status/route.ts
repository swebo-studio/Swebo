import { NextRequest, after } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { claimPaid, fulfillPaidOrder } from "@/lib/fulfillOrder";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status } = await req.json();

  if (!["paid", "pending", "failed"].includes(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  // Confirming a payment the customer's redirect never reported (they closed
  // the tab, or the wallet app didn't hand back) must do everything the
  // redirect would have: stock, SMS, and the HFD shipment — not just the flag.
  if (status === "paid") {
    if (await claimPaid(id)) {
      after(() => fulfillPaidOrder(id).catch((e) =>
        console.error("[Admin mark-paid] fulfillment failed:", id, e)
      ));
    }
    return Response.json({ id, status: "paid" });
  }

  const order = await prisma.order.update({
    where: { id },
    data: { status },
  });

  return Response.json({ id: order.id, status: order.status });
}
