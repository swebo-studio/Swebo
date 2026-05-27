import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { cancelHFDShipment } from "@/lib/hfd";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return Response.json({ error: "Not found" }, { status: 404 });
  if (!order.shipmentRandId) return Response.json({ error: "No shipment to cancel" }, { status: 400 });

  const result = await cancelHFDShipment(order.shipmentRandId);
  if (!result) return Response.json({ error: "Cancel request failed" }, { status: 503 });

  if (result.status === "OK") {
    await prisma.order.update({ where: { id }, data: { status: "cancelled" } });
  }

  return Response.json(result);
}
