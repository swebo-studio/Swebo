import type { AppliedReward } from "./promotions";

/**
 * Pricing maths for a cart that has promotions applied to it. Used by the
 * cart, the checkout summary and the order route, so all three agree on the
 * numbers. Kept free of Prisma imports so the browser can use it too.
 *
 * A product_discount may carry a `maxUnits` cap. The cap is spent across the
 * whole cart in line order — three shirts under a "50% off one" promotion get
 * one discounted unit between them, not one per line.
 */

export interface PricedLine {
  productId: string;
  price: number;
  quantity: number;
}

export interface LinePricing {
  /** combined % off reaching this line's discounted units (0 when none) */
  discountPct: number;
  /** how many of this line's units the discount reaches */
  discountedUnits: number;
  /** unit price for those units */
  discountedUnitPrice: number;
  /** what the line costs once the discount is applied */
  total: number;
  rawTotal: number;
  promotionNames: string[];
}

export interface PromotionPricing {
  /** one entry per input line, in the same order */
  lines: LinePricing[];
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
  const pctByProduct: Record<string, number> = {};
  const unitsLeft: Record<string, number> = {};
  const namesByProduct: Record<string, string[]> = {};

  for (const r of rewards) {
    if (r.type !== "product_discount" || !r.productId || !r.discountPct) continue;
    const prev = pctByProduct[r.productId] ?? 0;
    // Stack discounts: apply on top of each other
    pctByProduct[r.productId] = prev + r.discountPct - (prev * r.discountPct) / 100;
    // When several promotions hit one product, the tightest cap wins
    const cap = r.maxUnits && r.maxUnits > 0 ? r.maxUnits : Infinity;
    unitsLeft[r.productId] = Math.min(unitsLeft[r.productId] ?? Infinity, cap);
    const names = namesByProduct[r.productId] ?? [];
    names.push(r.promotionName);
    namesByProduct[r.productId] = names;
  }

  const lines: LinePricing[] = [];
  let rawSubtotal = 0;
  let itemSubtotal = 0;

  for (const item of items) {
    const pct = pctByProduct[item.productId] ?? 0;
    const available = unitsLeft[item.productId] ?? Infinity;
    const discountedUnits = pct > 0 ? Math.min(item.quantity, available) : 0;
    if (discountedUnits > 0) unitsLeft[item.productId] = available - discountedUnits;

    const discountedUnitPrice = discountedUnits > 0 ? Math.round(item.price * (1 - pct / 100)) : item.price;
    const rawTotal = item.price * item.quantity;
    const total = discountedUnitPrice * discountedUnits + item.price * (item.quantity - discountedUnits);

    lines.push({
      discountPct: discountedUnits > 0 ? pct : 0,
      discountedUnits,
      discountedUnitPrice,
      total,
      rawTotal,
      promotionNames: discountedUnits > 0 ? (namesByProduct[item.productId] ?? []) : [],
    });
    rawSubtotal += rawTotal;
    itemSubtotal += total;
  }

  const cartRewards = rewards.filter((r) => r.type === "cart_discount");
  const cartPct = cartRewards.reduce((sum, r) => sum + (r.discountPct ?? 0), 0);
  const cartAmount = cartRewards.reduce((sum, r) => sum + (r.discountAmount ?? 0), 0);
  const afterPct = cartPct > 0 ? Math.round(itemSubtotal * (1 - Math.min(cartPct, 100) / 100)) : itemSubtotal;
  const subtotal = cartAmount > 0 ? Math.max(0, afterPct - cartAmount) : afterPct;

  return {
    lines,
    rawSubtotal,
    itemSubtotal,
    subtotal,
    savings: rawSubtotal - subtotal,
    freeShipping: rewards.some((r) => r.type === "free_shipping"),
  };
}
