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

type ConditionInput = { type: string; minTotal?: number | null; productId?: string | null };
type RewardInput = { type: string; discountPct?: number | null; discountAmount?: number | null; productId?: string | null };

function mapCondition(c: ConditionInput) {
  return { type: c.type, minTotal: c.minTotal ?? null, productId: c.productId ?? null };
}
function mapReward(r: RewardInput) {
  return { type: r.type, discountPct: r.discountPct ?? null, discountAmount: r.discountAmount ?? null, productId: r.productId ?? null };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { name, active, conditions, rewards } = await req.json();

  const promotion = await prisma.promotion.create({
    data: {
      name,
      active: active ?? true,
      conditions: { create: (conditions ?? []).map(mapCondition) },
      rewards: { create: (rewards ?? []).map(mapReward) },
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
      conditions: { create: (conditions ?? []).map(mapCondition) },
      rewards: { create: (rewards ?? []).map(mapReward) },
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
