/**
 * Promotion tags on product cards. Pure — the admin preview imports it too,
 * so nothing here may reach for the database.
 */

import { freeShippingLabel, isFreeShippingScope } from "./shippingScope";

export const BADGE_SIZES = ["sm", "md", "lg"] as const;
export const BADGE_POSITIONS = ["top-right", "top-left", "bottom-right", "bottom-left"] as const;
export type BadgeSize = (typeof BADGE_SIZES)[number];
export type BadgePosition = (typeof BADGE_POSITIONS)[number];

export const DEFAULT_BADGE_COLOR = "#1E6B3C";
export const BADGE_TEXT_MAX = 30;

/** What a card needs to draw one tag. */
export interface CardBadge {
  text: string;
  color: string;
  size: BadgeSize;
  position: BadgePosition;
}

/** The fields of a promotion that decide its tag's default text. */
export interface BadgeOffer {
  kind: string;
  buyQuantity?: number | null;
  bundlePrice?: number | null;
  getQuantity?: number | null;
  getDiscountPct?: number | null;
  rewards?: { type: string; discountPct?: number | null; discountAmount?: number | null; shippingScope?: string | null }[];
}

/** A short line for the tag when the admin leaves the text empty: "2 ב-₪299", "1+1", "20% הנחה". */
export function defaultBadgeText(p: BadgeOffer): string {
  if (p.kind === "bundle" && p.buyQuantity && p.bundlePrice != null) return `${p.buyQuantity} ב-₪${p.bundlePrice}`;
  if (p.kind === "buy_get" && p.buyQuantity && p.getQuantity) {
    return p.getDiscountPct === 100 ? `${p.buyQuantity}+${p.getQuantity}` : `${p.getQuantity} ב-${p.getDiscountPct ?? 0}% הנחה`;
  }
  const discount = p.rewards?.find((r) => (r.type === "product_discount" || r.type === "cart_discount") && (r.discountPct || r.discountAmount));
  if (discount?.discountPct) return `${discount.discountPct}% הנחה`;
  if (discount?.discountAmount) return `₪${discount.discountAmount} הנחה`;
  const shipping = p.rewards?.find((r) => r.type === "free_shipping");
  if (shipping) return freeShippingLabel(isFreeShippingScope(shipping.shippingScope) ? shipping.shippingScope : "all");
  return "מבצע";
}

export function isBadgeSize(v: unknown): v is BadgeSize {
  return BADGE_SIZES.includes(v as BadgeSize);
}
export function isBadgePosition(v: unknown): v is BadgePosition {
  return BADGE_POSITIONS.includes(v as BadgePosition);
}
export function isHexColor(v: unknown): v is string {
  return typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);
}

/** Black or white, whichever reads better on the tag's color. */
export function badgeTextColor(hex: string): string {
  if (!isHexColor(hex)) return "#fff";
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.4 ? "#111" : "#fff";
}

export const BADGE_SIZE_CLASS: Record<BadgeSize, string> = {
  sm: "text-[10px] px-1.5 py-0.5",
  md: "text-xs px-2 py-1",
  lg: "text-sm px-3 py-1.5",
};

export const BADGE_POSITION_CLASS: Record<BadgePosition, string> = {
  "top-right": "top-2 right-2 items-end",
  "top-left": "top-2 left-2 items-start",
  "bottom-right": "bottom-2 right-2 items-end",
  "bottom-left": "bottom-2 left-2 items-start",
};

/** An active promotion as the storefront loads it for working out tags. */
export interface BadgePromotion extends BadgeOffer {
  badgeEnabled: boolean;
  badgeText: string | null;
  badgeColor: string;
  badgeSize: string;
  badgePosition: string;
  rewards: { type: string; productId: string | null; discountPct: number | null; discountAmount: number | null }[];
  items: { productId: string | null; category: { products: { id: string }[] } | null }[];
}

/** The Prisma include that loads what {@link promotionBadges} reads. */
export const BADGE_PROMOTION_INCLUDE = {
  rewards: true,
  items: { include: { category: { select: { products: { select: { id: true } } } } } },
} as const;

/**
 * Which tags each product gets. Bundles and buy-get offers tag every product
 * on their lists; a rules promotion tags the products it discounts, or every
 * product when its reward is store-wide (a cart discount, free shipping).
 */
export function promotionBadges(promotions: BadgePromotion[]): (productId: string) => CardBadge[] {
  const everywhere: CardBadge[] = [];
  const byProduct = new Map<string, CardBadge[]>();

  for (const p of promotions) {
    if (!p.badgeEnabled) continue;
    const badge: CardBadge = {
      text: p.badgeText?.trim() || defaultBadgeText(p),
      color: isHexColor(p.badgeColor) ? p.badgeColor : DEFAULT_BADGE_COLOR,
      size: isBadgeSize(p.badgeSize) ? p.badgeSize : "md",
      position: isBadgePosition(p.badgePosition) ? p.badgePosition : "bottom-left",
    };

    const productIds = new Set<string>();
    if (p.kind === "bundle" || p.kind === "buy_get") {
      for (const item of p.items) {
        if (item.productId) productIds.add(item.productId);
        item.category?.products.forEach((prod) => productIds.add(prod.id));
      }
    } else if (p.rewards.some((r) => r.type !== "product_discount")) {
      everywhere.push(badge);
      continue;
    } else {
      p.rewards.forEach((r) => { if (r.productId) productIds.add(r.productId); });
    }
    for (const id of productIds) byProduct.set(id, [...(byProduct.get(id) ?? []), badge]);
  }

  return (productId) => [...everywhere, ...(byProduct.get(productId) ?? [])];
}
