import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

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

  const order = await prisma.order.update({
    where: { id },
    data: { orderStage: stage },
  });

  return Response.json({ id: order.id, orderStage: order.orderStage });
}
