import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const promotions = await prisma.promotion.findMany({
    orderBy: { createdAt: "desc" },
    include: { conditions: true, rewards: true },
  });
  return Response.json(promotions);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { name, active, conditions, rewards } = await req.json();

  const promotion = await prisma.promotion.create({
    data: {
      name,
      active: active ?? true,
      conditions: { create: conditions ?? [] },
      rewards: { create: rewards ?? [] },
    },
    include: { conditions: true, rewards: true },
  });
  return Response.json(promotion, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id, name, active, conditions, rewards } = await req.json();

  // Replace conditions and rewards entirely
  await prisma.promotionCondition.deleteMany({ where: { promotionId: id } });
  await prisma.promotionReward.deleteMany({ where: { promotionId: id } });

  const promotion = await prisma.promotion.update({
    where: { id },
    data: {
      name,
      active,
      conditions: { create: conditions ?? [] },
      rewards: { create: rewards ?? [] },
    },
    include: { conditions: true, rewards: true },
  });
  return Response.json(promotion);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  await prisma.promotion.delete({ where: { id } });
  return Response.json({ ok: true });
}
