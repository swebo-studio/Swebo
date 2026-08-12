import { prisma } from "@/lib/db";

/**
 * Combines a manual "compare at" price (admin-set sale price) with any active
 * automatic % cart discount to produce the price pair shown on product cards/pages.
 */
export function computeDisplayPrice(
  price: number,
  comparePrice: number | null | undefined,
  cartDiscountPct: number
): { displayPrice: number; originalPrice?: number } {
  const hasManualDiscount = comparePrice != null && comparePrice > price;
  const displayPrice = cartDiscountPct > 0 ? Math.round(price * (1 - cartDiscountPct / 100)) : price;
  const originalPrice = hasManualDiscount ? comparePrice : (cartDiscountPct > 0 ? price : undefined);
  return { displayPrice, originalPrice };
}

export interface CartItemInput {
  productId: string;
  quantity: number;
  price: number;
  color?: string;
  size?: string;
}

export interface AppliedReward {
  type: "free_shipping" | "cart_discount" | "product_discount";
  /** which promotion granted this — two promotions offering the same % are not the same offer */
  promotionId: string;
  promotionName: string;
  /** true = no other promotion may discount the products this one discounts */
  exclusive: boolean;
  discountPct?: number;
  discountAmount?: number;
  productId?: string;
  productName?: string;
  /** product_discount: units the discount reaches; undefined = every unit */
  maxUnits?: number;
}

/**
 * A reward the shopper does not have yet but is one small step away from:
 * either the promotion is already unlocked and they just have to add the
 * discounted product, or they are short of a minimum-cart threshold.
 */
export interface PotentialReward {
  kind: "add_product" | "spend_more";
  promotionName: string;
  reward: AppliedReward;
  /** shekels still missing from the cart — "spend_more" only */
  remaining?: number;
}

export interface PromotionEvaluation {
  /** rewards that affect what this cart costs right now */
  applied: AppliedReward[];
  /** rewards still on the table */
  potential: PotentialReward[];
}

/** Rewards that are already changing this cart's price — used for pricing. */
export async function evaluatePromotions(
  cartItems: CartItemInput[],
  subtotal: number
): Promise<AppliedReward[]> {
  return (await evaluateCartPromotions(cartItems, subtotal)).applied;
}

export async function evaluateCartPromotions(
  cartItems: CartItemInput[],
  subtotal: number
): Promise<PromotionEvaluation> {
  const promotions = await prisma.promotion.findMany({
    where: { active: true },
    include: {
      conditions: true,
      rewards: { include: { promotion: false } },
    },
  });

  const cartProductIds = cartItems.map((i) => i.productId);

  // Fetch product names for rewards that reference a product
  const allProductIds = new Set<string>();
  promotions.forEach((p) => {
    p.conditions.forEach((c) => { if (c.productId) allProductIds.add(c.productId); });
    p.rewards.forEach((r) => { if (r.productId) allProductIds.add(r.productId); });
  });
  const products = allProductIds.size > 0
    ? await prisma.product.findMany({ where: { id: { in: [...allProductIds] } }, select: { id: true, nameHe: true } })
    : [];
  const productName = (id: string) => products.find((p) => p.id === id)?.nameHe ?? id;

  const applied: AppliedReward[] = [];
  const potential: PotentialReward[] = [];

  for (const promotion of promotions) {
    const toReward = (r: (typeof promotion.rewards)[number]): AppliedReward => ({
      type: r.type as AppliedReward["type"],
      promotionId: promotion.id,
      promotionName: promotion.name,
      exclusive: promotion.exclusive,
      discountPct: r.discountPct ?? undefined,
      discountAmount: r.discountAmount ?? undefined,
      productId: r.productId ?? undefined,
      productName: r.productId ? productName(r.productId) : undefined,
      maxUnits: r.maxUnits ?? undefined,
    });

    const meetsCondition = (c: (typeof promotion.conditions)[number]) => {
      if (c.type === "min_cart_total") return subtotal >= (c.minTotal ?? 0);
      if (c.type === "product_in_cart") return cartProductIds.includes(c.productId ?? "");
      return false; // an unrecognised condition never qualifies a promotion
    };

    // "any" = one condition is enough (OR); "all" = every one must hold (AND).
    // A promotion with no conditions qualifies under either reading.
    const anyLogic = promotion.conditionLogic === "any";
    const unmet = promotion.conditions.filter((c) => !meetsCondition(c));
    const qualifies = promotion.conditions.length === 0 || (anyLogic ? unmet.length < promotion.conditions.length : unmet.length === 0);

    if (qualifies) {
      for (const r of promotion.rewards) {
        const reward = toReward(r);
        // A discount on a product that isn't in the cart saves nothing yet —
        // it's an offer the shopper can still take, not money off this cart.
        if (reward.type === "product_discount" && reward.productId && !cartProductIds.includes(reward.productId)) {
          potential.push({ kind: "add_product", promotionName: promotion.name, reward });
        } else {
          applied.push(reward);
        }
      }
      continue;
    }

    // Near miss: the shopper is only short of a spend threshold. Under "all"
    // they have to clear every outstanding threshold, so quote the largest gap;
    // under "any" clearing the nearest one is enough, so quote the smallest.
    const thresholds = unmet.filter((c) => c.type === "min_cart_total");
    if (thresholds.length === 0) continue;
    if (!anyLogic && thresholds.length !== unmet.length) continue; // a non-spend condition is also missing
    const gaps = thresholds.map((c) => (c.minTotal ?? 0) - subtotal);
    const remaining = Math.ceil(anyLogic ? Math.min(...gaps) : Math.max(...gaps));
    for (const r of promotion.rewards) {
      potential.push({ kind: "spend_more", promotionName: promotion.name, reward: toReward(r), remaining });
    }
  }

  return { applied, potential };
}
