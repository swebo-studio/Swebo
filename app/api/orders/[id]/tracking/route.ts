import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getHFDTracking } from "@/lib/hfd";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return Response.json({ error: "Not found" }, { status: 404 });
  if (!order.shipmentNumber) return Response.json({ error: "No shipment yet" }, { status: 404 });

  const tracking = await getHFDTracking(order.shipmentNumber);
  if (!tracking) return Response.json({ error: "Tracking unavailable" }, { status: 503 });

  return Response.json(tracking);
}
