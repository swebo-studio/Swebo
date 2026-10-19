import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { BADGE_TEXT_MAX, DEFAULT_BADGE_COLOR, isBadgePosition, isBadgeSize, isHexColor } from "@/lib/promotionBadges";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const promotions = await prisma.promotion.findMany({
    orderBy: { createdAt: "desc" },
    include: { conditions: true, rewards: true, items: true },
  });
  return Response.json(promotions);
}

type ConditionInput = { type: string; minTotal?: number | null; productId?: string | null };
type RewardInput = { type: string; discountPct?: number | null; discountAmount?: number | null; productId?: string | null; maxUnits?: number | null };
type ItemInput = { role: string; productId?: string | null; categoryId?: string | null };

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
/** A positive whole count, or null. */
function count(v: number | null | undefined) {
  if (v == null || Number.isNaN(v) || v < 1) return null;
  return Math.floor(v);
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

function mapItem(i: ItemInput) {
  // Exactly one of the two: a whole category, or a single product.
  return i.categoryId
    ? { role: i.role, categoryId: i.categoryId, productId: null }
    : { role: i.role, productId: i.productId ?? null, categoryId: null };
}

const CONDITION_LOGIC = ["all", "any"] as const;
function mapLogic(v: unknown) {
  return CONDITION_LOGIC.includes(v as (typeof CONDITION_LOGIC)[number]) ? (v as string) : "all";
}

/** The card tag's settings; anything unrecognised falls back to a default rather than failing the save. */
function mapBadge(body: Record<string, unknown>) {
  const text = typeof body.badgeText === "string" ? body.badgeText.trim().slice(0, BADGE_TEXT_MAX) : "";
  return {
    badgeEnabled: !!body.badgeEnabled,
    badgeText: text || null,
    badgeColor: isHexColor(body.badgeColor) ? body.badgeColor : DEFAULT_BADGE_COLOR,
    badgeSize: isBadgeSize(body.badgeSize) ? body.badgeSize : "md",
    badgePosition: isBadgePosition(body.badgePosition) ? body.badgePosition : "bottom-left",
  };
}

const KINDS = ["rules", "bundle", "buy_get"] as const;
type Kind = (typeof KINDS)[number];

/**
 * Turns a request body into the promotion's columns and children for its kind.
 * Fields that belong to another kind are cleared, so a promotion never carries
 * leftovers that the engine might one day read. Returns an error message when
 * the promotion could not work as asked.
 */
function toPromotionData(body: Record<string, unknown>) {
  const kind: Kind = KINDS.includes(body.kind as Kind) ? (body.kind as Kind) : "rules";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return { error: "חסר שם למבצע" };

  const items = ((body.items as ItemInput[] | undefined) ?? [])
    .filter((i) => (i.role === "buy" || (i.role === "get" && kind === "buy_get")) && (i.productId || i.categoryId))
    .map(mapItem);
  const buyQuantity = count(body.buyQuantity as number);
  const maxApplications = count(body.maxApplications as number);

  const common = {
    name,
    kind,
    active: body.active === undefined ? true : !!body.active,
    exclusive: body.exclusive === undefined ? true : !!body.exclusive,
    ...mapBadge(body),
  };
  const noMulti = { buyQuantity: null, bundlePrice: null, getQuantity: null, getDiscountPct: null, maxApplications: null };

  if (kind === "bundle") {
    const bundlePrice = clampAmount(body.bundlePrice as number);
    if (!buyQuantity || buyQuantity < 2) return { error: "חבילה צריכה לפחות 2 פריטים" };
    if (bundlePrice == null) return { error: "חסר מחיר לחבילה" };
    if (!items.some((i) => i.role === "buy")) return { error: "יש לבחור מוצרים או קטגוריות לחבילה" };
    return {
      data: { ...common, ...noMulti, conditionLogic: "all", buyQuantity, bundlePrice, maxApplications },
      conditions: [], rewards: [], items,
    };
  }

  if (kind === "buy_get") {
    const getQuantity = count(body.getQuantity as number);
    const getDiscountPct = clampPct(body.getDiscountPct as number);
    if (!buyQuantity) return { error: "חסרה כמות לקנייה" };
    if (!getQuantity) return { error: "חסרה כמות למתנה" };
    if (!getDiscountPct) return { error: "חסר אחוז הנחה" };
    if (!items.some((i) => i.role === "buy")) return { error: "יש לבחור ממה קונים" };
    if (!items.some((i) => i.role === "get")) return { error: "יש לבחור מה מקבלים" };
    return {
      data: { ...common, ...noMulti, conditionLogic: "all", buyQuantity, getQuantity, getDiscountPct, maxApplications },
      conditions: [], rewards: [], items,
    };
  }

  return {
    data: { ...common, ...noMulti, conditionLogic: mapLogic(body.conditionLogic) },
    conditions: ((body.conditions as ConditionInput[] | undefined) ?? []).map(mapCondition),
    rewards: ((body.rewards as RewardInput[] | undefined) ?? []).map(mapReward),
    items: [],
  };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = toPromotionData(await req.json());
  if ("error" in parsed) return Response.json({ error: parsed.error }, { status: 400 });

  const promotion = await prisma.promotion.create({
    data: {
      ...parsed.data,
      conditions: { create: parsed.conditions },
      rewards: { create: parsed.rewards },
      items: { create: parsed.items },
    },
    include: { conditions: true, rewards: true, items: true },
  });
  return Response.json(promotion, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = toPromotionData(body);
  if ("error" in parsed) return Response.json({ error: parsed.error }, { status: 400 });

  // Replace conditions, rewards and lists entirely — in one transaction, so a
  // failed save cannot leave a live promotion with nothing in it.
  const [, , , promotion] = await prisma.$transaction([
    prisma.promotionCondition.deleteMany({ where: { promotionId: body.id } }),
    prisma.promotionReward.deleteMany({ where: { promotionId: body.id } }),
    prisma.promotionItem.deleteMany({ where: { promotionId: body.id } }),
    prisma.promotion.update({
      where: { id: body.id },
      data: {
        ...parsed.data,
        conditions: { create: parsed.conditions },
        rewards: { create: parsed.rewards },
        items: { create: parsed.items },
      },
      include: { conditions: true, rewards: true, items: true },
    }),
  ]);
  return Response.json(promotion);
}

/** Switches a promotion on or off without touching anything else about it. */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id, active } = await req.json();
  const promotion = await prisma.promotion.update({ where: { id }, data: { active: !!active } });
  return Response.json(promotion);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  await prisma.promotion.delete({ where: { id } });
  return Response.json({ ok: true });
}
