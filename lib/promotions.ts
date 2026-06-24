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
  promotionName: string;
  discountPct?: number;
  discountAmount?: number;
  productId?: string;
  productName?: string;
}

export async function evaluatePromotions(
  cartItems: CartItemInput[],
  subtotal: number
): Promise<AppliedReward[]> {
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

  const rewards: AppliedReward[] = [];

  for (const promotion of promotions) {
    // All conditions must be met (AND)
    const conditionsMet = promotion.conditions.every((c) => {
      if (c.type === "min_cart_total") return subtotal >= (c.minTotal ?? 0);
      if (c.type === "product_in_cart") return cartProductIds.includes(c.productId ?? "");
      return false;
    });

    if (!conditionsMet) continue;

    for (const reward of promotion.rewards) {
      rewards.push({
        type: reward.type as AppliedReward["type"],
        promotionName: promotion.name,
        discountPct: reward.discountPct ?? undefined,
        discountAmount: reward.discountAmount ?? undefined,
        productId: reward.productId ?? undefined,
        productName: reward.productId ? productName(reward.productId) : undefined,
      });
    }
  }

  return rewards;
}

export function applyRewards(
  cartItems: CartItemInput[],
  baseSubtotal: number,
  baseDelivery: number,
  rewards: AppliedReward[]
): { subtotal: number; delivery: number; itemPrices: Record<string, number> } {
  let subtotal = baseSubtotal;
  let delivery = baseDelivery;
  // productId → effective price per unit (take the best discount per product)
  const itemDiscounts: Record<string, number> = {};

  for (const reward of rewards) {
    if (reward.type === "free_shipping") {
      delivery = 0;
    } else if (reward.type === "cart_discount") {
      if (reward.discountAmount) {
        subtotal = Math.max(0, subtotal - reward.discountAmount);
      } else if (reward.discountPct) {
        subtotal = Math.round(subtotal * (1 - reward.discountPct / 100));
      }
    } else if (reward.type === "product_discount" && reward.productId && reward.discountPct) {
      const existing = itemDiscounts[reward.productId] ?? 0;
      // Stack discounts: apply on top of each other
      itemDiscounts[reward.productId] = existing + reward.discountPct - (existing * reward.discountPct) / 100;
    }
  }

  // Rebuild effective per-unit prices
  const itemPrices: Record<string, number> = {};
  for (const item of cartItems) {
    const discount = itemDiscounts[item.productId];
    if (discount) {
      itemPrices[item.productId] = Math.round(item.price * (1 - discount / 100));
    }
  }

  // Recalculate subtotal with item discounts
  if (Object.keys(itemDiscounts).length > 0) {
    subtotal = cartItems.reduce((sum, item) => {
      const effectivePrice = itemPrices[item.productId] ?? item.price;
      return sum + effectivePrice * item.quantity;
    }, 0);
    // Re-apply cart_discount on top of item-discounted subtotal if any
    for (const reward of rewards) {
      if (reward.type === "cart_discount") {
        if (reward.discountAmount) {
          subtotal = Math.max(0, subtotal - reward.discountAmount);
        } else if (reward.discountPct) {
          subtotal = Math.round(subtotal * (1 - reward.discountPct / 100));
        }
      }
    }
  }

  return { subtotal, delivery, itemPrices };
}
