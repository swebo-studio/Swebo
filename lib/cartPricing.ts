import type { AppliedReward } from "./promotions";

/**
 * Client-safe pricing maths for a cart that has promotions applied to it.
 * Mirrors `applyRewards` (the server-side source of truth) so the cart,
 * the checkout summary and the created order all agree on the numbers.
 * Kept out of lib/promotions.ts so the browser never pulls in Prisma.
 */

export interface PricedLine {
  productId: string;
  price: number;
  quantity: number;
}

export interface PromotionPricing {
  /** productId → combined % off from product_discount rewards */
  productDiscountPct: Record<string, number>;
  /** productId → discounted unit price (discounted products only) */
  productUnitPrice: Record<string, number>;
  /** productId → names of the promotions discounting it */
  productPromotionNames: Record<string, string[]>;
  rawSubtotal: number;
  /** after per-product discounts, before cart-wide ones */
  itemSubtotal: number;
  /** after cart-wide discounts too */
  subtotal: number;
  /** rawSubtotal − subtotal */
  savings: number;
  freeShipping: boolean;
}

export function promotionPricing(items: PricedLine[], rewards: AppliedReward[]): PromotionPricing {
  const productDiscountPct: Record<string, number> = {};
  const productPromotionNames: Record<string, string[]> = {};

  for (const r of rewards) {
    if (r.type !== "product_discount" || !r.productId || !r.discountPct) continue;
    const prev = productDiscountPct[r.productId] ?? 0;
    // Stack discounts: apply on top of each other
    productDiscountPct[r.productId] = prev + r.discountPct - (prev * r.discountPct) / 100;
    const names = productPromotionNames[r.productId] ?? [];
    names.push(r.promotionName);
    productPromotionNames[r.productId] = names;
  }

  const productUnitPrice: Record<string, number> = {};
  let rawSubtotal = 0;
  let itemSubtotal = 0;
  for (const item of items) {
    const pct = productDiscountPct[item.productId] ?? 0;
    const unit = pct ? Math.round(item.price * (1 - pct / 100)) : item.price;
    if (pct) productUnitPrice[item.productId] = unit;
    rawSubtotal += item.price * item.quantity;
    itemSubtotal += unit * item.quantity;
  }

  const cartRewards = rewards.filter((r) => r.type === "cart_discount");
  const cartPct = cartRewards.reduce((sum, r) => sum + (r.discountPct ?? 0), 0);
  const cartAmount = cartRewards.reduce((sum, r) => sum + (r.discountAmount ?? 0), 0);
  const afterPct = cartPct > 0 ? Math.round(itemSubtotal * (1 - Math.min(cartPct, 100) / 100)) : itemSubtotal;
  const subtotal = cartAmount > 0 ? Math.max(0, afterPct - cartAmount) : afterPct;

  return {
    productDiscountPct,
    productUnitPrice,
    productPromotionNames,
    rawSubtotal,
    itemSubtotal,
    subtotal,
    savings: rawSubtotal - subtotal,
    freeShipping: rewards.some((r) => r.type === "free_shipping"),
  };
}
