import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { starred } = await req.json();
  if (typeof starred !== "boolean") {
    return Response.json({ error: "Invalid starred" }, { status: 400 });
  }

  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const order = await prisma.order.update({ where: { id }, data: { starred } });
  return Response.json({ id: order.id, starred: order.starred });
}
