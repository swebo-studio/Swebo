/**
 * Which delivery a free-shipping offer (a coupon or a promotion) makes free.
 * Pure — the checkout and the order API both use it, so what the shopper is
 * shown and what they are charged cannot drift apart.
 */

export const FREE_SHIPPING_SCOPES = ["all", "home", "epost"] as const;
export type FreeShippingScope = (typeof FREE_SHIPPING_SCOPES)[number];
export type DeliveryMode = "home" | "epost" | "self";

export function isFreeShippingScope(v: unknown): v is FreeShippingScope {
  return FREE_SHIPPING_SCOPES.includes(v as FreeShippingScope);
}

/** Whether an offer with this scope makes this delivery free. Self-pickup is free anyway. */
export function scopeCoversDelivery(scope: string | null | undefined, mode: DeliveryMode): boolean {
  if (!isFreeShippingScope(scope) || mode === "self") return false;
  return scope === "all" || scope === mode;
}

/** How the offer reads to people: "משלוח חינם עד הבית", … */
export function freeShippingLabel(scope: FreeShippingScope): string {
  if (scope === "home") return "משלוח חינם עד הבית";
  if (scope === "epost") return "משלוח חינם לנקודת איסוף";
  return "משלוח חינם";
}

/**
 * The combined scope of several free-shipping offers: a home-only one plus a
 * pickup-point-only one cover both. null = none of them.
 */
export function mergeScopes(scopes: (string | null | undefined)[]): FreeShippingScope | null {
  const valid = scopes.filter(isFreeShippingScope);
  if (valid.length === 0) return null;
  if (valid.includes("all") || (valid.includes("home") && valid.includes("epost"))) return "all";
  return valid[0];
}
