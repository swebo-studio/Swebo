import { prisma } from "@/lib/db";
import { promotionPricing } from "@/lib/cartPricing";
import type { Prisma } from "@/app/generated/prisma/client";

/** A bundle / buy_get list entry with just enough attached to resolve and name it. */
const LIST_ITEM = {
  include: {
    product: { select: { nameHe: true } },
    category: { select: { nameHe: true, products: { select: { id: true } } } },
  },
} satisfies Prisma.PromotionItemDefaultArgs;
type ListItem = Prisma.PromotionItemGetPayload<typeof LIST_ITEM>;

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
  type: "free_shipping" | "cart_discount" | "product_discount" | "bundle" | "buy_get";
  /** which promotion granted this — two promotions offering the same % are not the same offer */
  promotionId: string;
  promotionName: string;
  /** true = no other promotion may discount the products this one discounts */
  exclusive: boolean;
  /** product_discount / buy_get: % off the discounted units */
  discountPct?: number;
  discountAmount?: number;
  productId?: string;
  productName?: string;
  /** product_discount: units the discount reaches; undefined = every unit */
  maxUnits?: number;
  /** free_shipping: which delivery it makes free; undefined = home and pickup point */
  shippingScope?: string;
  /** bundle: the products the bundle is made of · buy_get: what counts as a purchase */
  buyProductIds?: string[];
  /** buy_get: the products that get the discount */
  getProductIds?: string[];
  /** bundle: items per bundle · buy_get: items to buy */
  buyQuantity?: number;
  /** buy_get: discounted items per purchase */
  getQuantity?: number;
  /** bundle: what one whole bundle costs */
  bundlePrice?: number;
  /** bundle / buy_get: times it applies per cart; undefined = no limit */
  maxApplications?: number;
  /** where the buy / get items come from, as a phrase ("מקטגוריית חורף"); unset when no short phrase fits */
  buyFrom?: string;
  getFrom?: string;
}

/**
 * A reward the shopper does not have yet but is one small step away from:
 * the promotion is unlocked and they just have to add the discounted product
 * (or an item from the "get" list), they are short of a minimum-cart
 * threshold, or they need a few more items from a bundle / buy list.
 */
export interface PotentialReward {
  kind: "add_product" | "spend_more" | "add_items" | "add_get_item";
  promotionName: string;
  reward: AppliedReward;
  /** shekels still missing from the cart — "spend_more" only */
  remaining?: number;
  /** items still missing from the buy list — "add_items" only */
  missing?: number;
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
      items: LIST_ITEM,
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
    if (promotion.kind === "bundle" || promotion.kind === "buy_get") {
      const reward = toMultiReward(promotion);
      if (reward) judgeMultiReward(reward, cartItems, applied, potential);
      continue;
    }

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
      shippingScope: r.shippingScope ?? undefined,
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

type PromotionWithItems = Prisma.PromotionGetPayload<{ include: { items: typeof LIST_ITEM } }>;

/**
 * One list (the "buy" or the "get" side) resolved to product ids, plus where
 * its items come from as a phrase for the shopper: the category names when it
 * is one or two whole categories, the product when it is one product. A
 * hand-picked list has no short name, so it gets none.
 */
function resolveList(items: ListItem[]) {
  const productIds = new Set<string>();
  const categoryNames: string[] = [];
  const productNames: string[] = [];
  for (const item of items) {
    if (item.category) {
      item.category.products.forEach((p) => productIds.add(p.id));
      categoryNames.push(item.category.nameHe);
    } else if (item.productId && item.product) {
      productIds.add(item.productId);
      productNames.push(item.product.nameHe);
    }
  }
  const from =
    productNames.length === 0 && categoryNames.length > 0 && categoryNames.length <= 2 ? `מקטגוריית ${categoryNames.join(" או ")}` :
    categoryNames.length === 0 && productNames.length === 1 ? `מ${productNames[0]}` :
    undefined;
  return { productIds: [...productIds], from };
}

function toMultiReward(promotion: PromotionWithItems): AppliedReward | null {
  const buy = resolveList(promotion.items.filter((i) => i.role === "buy"));
  const get = resolveList(promotion.items.filter((i) => i.role === "get"));
  if (buy.productIds.length === 0 || !promotion.buyQuantity) return null;
  const base = {
    promotionId: promotion.id,
    promotionName: promotion.name,
    exclusive: promotion.exclusive,
    buyProductIds: buy.productIds,
    buyFrom: buy.from,
    buyQuantity: promotion.buyQuantity,
    maxApplications: promotion.maxApplications ?? undefined,
  };
  if (promotion.kind === "bundle") {
    if (promotion.bundlePrice == null) return null;
    return { ...base, type: "bundle", bundlePrice: promotion.bundlePrice };
  }
  if (get.productIds.length === 0 || !promotion.getQuantity || !promotion.getDiscountPct) return null;
  return {
    ...base,
    type: "buy_get",
    getProductIds: get.productIds,
    getFrom: get.from,
    getQuantity: promotion.getQuantity,
    discountPct: promotion.getDiscountPct,
  };
}

/**
 * Applied when the pricing engine, given this reward alone, actually gives
 * something off — the only reliable test once lists overlap. Otherwise it is a
 * near miss if the shopper has started on the buy list.
 */
function judgeMultiReward(
  reward: AppliedReward,
  cartItems: CartItemInput[],
  applied: AppliedReward[],
  potential: PotentialReward[]
) {
  if (promotionPricing(cartItems, [reward]).savings > 0) {
    applied.push(reward);
    return;
  }
  const inBuyList = cartItems
    .filter((i) => reward.buyProductIds?.includes(i.productId))
    .reduce((sum, i) => sum + i.quantity, 0);
  if (inBuyList === 0) return;
  const needed = reward.buyQuantity ?? 1;
  if (inBuyList < needed) {
    potential.push({ kind: "add_items", promotionName: reward.promotionName, reward, missing: needed - inBuyList });
  } else if (reward.type === "buy_get") {
    potential.push({ kind: "add_get_item", promotionName: reward.promotionName, reward });
  }
}
