import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notifyOrderStage } from "@/lib/notify";

const VALID_STAGES = ["received", "packed", "shipped", "done"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { stage } = await req.json();

  if (!VALID_STAGES.includes(stage)) {
    return Response.json({ error: "Invalid stage" }, { status: 400 });
  }

  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const order = await prisma.order.update({
    where: { id },
    data: { orderStage: stage },
  });

  // Text the buyer about the new stage — but only on an actual change, so
  // re-clicking the same stage can't spam them. A failed SMS must not fail
  // the stage update.
  if (existing.orderStage !== stage) {
    try {
      await notifyOrderStage(order, stage);
    } catch (e) {
      console.error("[Order stage] customer SMS failed:", order.id, stage, e);
    }
  }

  return Response.json({ id: order.id, orderStage: order.orderStage });
}
