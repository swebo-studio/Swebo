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
type RewardInput = { type: string; discountPct?: number | null; discountAmount?: number | null; productId?: string | null; maxUnits?: number | null };

function mapCondition(c: ConditionInput) {
  return { type: c.type, minTotal: c.minTotal ?? null, productId: c.productId ?? null };
}

/** A percentage above 100 or below 0 can only ever produce a wrong price. */
function clampPct(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return null;
  return Math.max(0, Math.min(100, Math.round(v)));
}
function clampAmount(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return null;
  return Math.max(0, Math.round(v));
}

function mapReward(r: RewardInput) {
  const maxUnits = r.type === "product_discount" && r.maxUnits && r.maxUnits > 0 ? Math.floor(r.maxUnits) : null;
  return {
    type: r.type,
    discountPct: clampPct(r.discountPct),
    discountAmount: clampAmount(r.discountAmount),
    productId: r.productId ?? null,
    maxUnits,
  };
}

const CONDITION_LOGIC = ["all", "any"] as const;
function mapLogic(v: unknown) {
  return CONDITION_LOGIC.includes(v as (typeof CONDITION_LOGIC)[number]) ? (v as string) : "all";
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { name, active, conditionLogic, exclusive, conditions, rewards } = await req.json();

  const promotion = await prisma.promotion.create({
    data: {
      name,
      active: active ?? true,
      conditionLogic: mapLogic(conditionLogic),
      exclusive: exclusive ?? true,
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

  const { id, name, active, conditionLogic, exclusive, conditions, rewards } = await req.json();

  // Replace conditions and rewards entirely
  await prisma.promotionCondition.deleteMany({ where: { promotionId: id } });
  await prisma.promotionReward.deleteMany({ where: { promotionId: id } });

  const promotion = await prisma.promotion.update({
    where: { id },
    data: {
      name,
      active,
      conditionLogic: mapLogic(conditionLogic),
      exclusive: exclusive ?? true,
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
