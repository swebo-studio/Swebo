/** Shapes shared by the admin promotions page and its per-kind forms. */
import type { FreeShippingScope } from "@/lib/shippingScope";
import { DEFAULT_BADGE_COLOR, type BadgePosition, type BadgeSize } from "@/lib/promotionBadges";

export interface Product { id: string; nameHe: string; price: number }
export interface Category { id: string; nameHe: string }

export interface Condition {
  id?: string;
  type: "min_cart_total" | "product_in_cart";
  minTotal?: number | null;
  productId?: string | null;
}

export interface Reward {
  id?: string;
  type: "free_shipping" | "cart_discount" | "product_discount";
  discountPct?: number | null;
  discountAmount?: number | null;
  productId?: string | null;
  /** product_discount: units the discount reaches; null = every unit in the cart */
  maxUnits?: number | null;
  /** free_shipping: which delivery it makes free; null = home and pickup point */
  shippingScope?: FreeShippingScope | null;
}

/** One entry of a bundle / buy_get list: a whole category or one product. */
export interface ListItem {
  role: "buy" | "get";
  productId?: string | null;
  categoryId?: string | null;
}

export type ConditionLogic = "all" | "any";
export type PromotionKind = "rules" | "bundle" | "buy_get";

/** Everything the modal edits. Fields of other kinds are ignored on save. */
export interface PromotionDraft {
  kind: PromotionKind;
  name: string;
  active: boolean;
  /** true = no other promotion may discount the products this one discounts */
  exclusive: boolean;
  // rules
  /** "all" = every condition must hold (AND) · "any" = one is enough (OR) */
  conditionLogic: ConditionLogic;
  conditions: Condition[];
  rewards: Reward[];
  // bundle / buy_get
  buyQuantity: number | null;
  bundlePrice: number | null;
  getQuantity: number | null;
  getDiscountPct: number | null;
  /** null = applies as many times as the cart allows */
  maxApplications: number | null;
  items: ListItem[];
  // the tag on the product cards
  badgeEnabled: boolean;
  /** empty = the text worked out from the offer */
  badgeText: string;
  badgeColor: string;
  badgeSize: BadgeSize;
  badgePosition: BadgePosition;
}

export interface Promotion extends PromotionDraft {
  id: string;
}

export type PatchDraft = (patch: Partial<PromotionDraft>) => void;

export function emptyCondition(): Condition { return { type: "min_cart_total", minTotal: 300, productId: null }; }
export function emptyReward(): Reward { return { type: "free_shipping", discountPct: null, discountAmount: null, productId: null, maxUnits: null, shippingScope: "all" }; }

/** The starting point for each tab; switching tabs on a new promotion resets to these. */
type Kept = "name" | "active" | "exclusive" | "badgeEnabled" | "badgeText" | "badgeColor" | "badgeSize" | "badgePosition";
export function draftFor(kind: PromotionKind, keep?: Partial<Pick<PromotionDraft, Kept>>): PromotionDraft {
  const base: PromotionDraft = {
    kind,
    name: keep?.name ?? "",
    active: keep?.active ?? true,
    exclusive: keep?.exclusive ?? true,
    conditionLogic: "all",
    conditions: [],
    rewards: [],
    buyQuantity: null,
    bundlePrice: null,
    getQuantity: null,
    getDiscountPct: null,
    maxApplications: null,
    items: [],
    badgeEnabled: keep?.badgeEnabled ?? false,
    badgeText: keep?.badgeText ?? "",
    badgeColor: keep?.badgeColor ?? DEFAULT_BADGE_COLOR,
    badgeSize: keep?.badgeSize ?? "md",
    badgePosition: keep?.badgePosition ?? "bottom-left",
  };
  if (kind === "rules") return { ...base, conditions: [emptyCondition()], rewards: [emptyReward()] };
  if (kind === "bundle") return { ...base, buyQuantity: 3, maxApplications: null };
  return { ...base, buyQuantity: 1, getQuantity: 1, getDiscountPct: 100 };
}

/** Why the draft cannot be saved yet, or null when it can. Mirrors the API's checks. */
export function draftProblem(d: PromotionDraft): string | null {
  if (!d.name.trim()) return "חסר שם למבצע";
  const has = (role: ListItem["role"]) => d.items.some((i) => i.role === role);
  if (d.kind === "bundle") {
    if (!d.buyQuantity || d.buyQuantity < 2) return "חבילה צריכה לפחות 2 פריטים";
    if (d.bundlePrice == null) return "חסר מחיר לחבילה";
    if (!has("buy")) return "יש לבחור מוצרים או קטגוריות לחבילה";
  }
  if (d.kind === "buy_get") {
    if (!d.buyQuantity) return "חסרה כמות לקנייה";
    if (!d.getQuantity) return "חסרה כמות למתנה";
    if (!d.getDiscountPct) return "חסר אחוז הנחה";
    if (!has("buy")) return "יש לבחור ממה קונים";
    if (!has("get")) return "יש לבחור מה מקבלים";
  }
  return null;
}
