/**
 * Free-shipping coupons. Pure — the checkout and the order API both use it,
 * so what the shopper is shown and what they are charged cannot drift apart.
 */

export const FREE_SHIPPING_SCOPES = ["all", "home", "epost"] as const;
export type FreeShippingScope = (typeof FREE_SHIPPING_SCOPES)[number];
export type DeliveryMode = "home" | "epost" | "self";

export function isFreeShippingScope(v: unknown): v is FreeShippingScope {
  return FREE_SHIPPING_SCOPES.includes(v as FreeShippingScope);
}

/** Whether a coupon with this scope makes this delivery free. Self-pickup is free anyway. */
export function couponCoversDelivery(scope: string | null | undefined, mode: DeliveryMode): boolean {
  if (!isFreeShippingScope(scope) || mode === "self") return false;
  return scope === "all" || scope === mode;
}

/** How the coupon reads to people: "משלוח חינם עד הבית", … */
export function freeShippingLabel(scope: FreeShippingScope): string {
  if (scope === "home") return "משלוח חינם עד הבית";
  if (scope === "epost") return "משלוח חינם לנקודת איסוף";
  return "משלוח חינם";
}
