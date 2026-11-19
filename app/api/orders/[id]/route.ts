import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { applyOrderEdit, OrderEditError, parseOrderEdit } from "@/lib/orderEdit";

type Ctx = { params: Promise<{ id: string }> };

/** An admin's edit of a placed order — see lib/orderEdit. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = parseOrderEdit(await req.json().catch(() => null));
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  try {
    const order = await applyOrderEdit(id, parsed.input);
    return Response.json(order);
  } catch (e) {
    if (e instanceof OrderEditError) return Response.json({ error: e.message }, { status: 400 });
    console.error("[Order edit] failed:", id, e);
    return Response.json({ error: "השמירה נכשלה — נסו שוב" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.orderItem.deleteMany({ where: { orderId: id } });
  await prisma.order.delete({ where: { id } });
  return Response.json({ ok: true });
}
