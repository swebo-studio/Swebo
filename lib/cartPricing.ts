import type { AppliedReward } from "./promotions";
import { mergeScopes, type FreeShippingScope } from "./shippingScope";

/**
 * Pricing maths for a cart that has promotions applied to it. Used by the
 * cart, the checkout summary and the order route, so all three agree on the
 * numbers. Kept free of Prisma imports so the browser can use it too.
 *
 * The engine works on individual *units*, not on lines or on products, because
 * that is the only level at which "how many items actually got the discount"
 * is a well-defined question. The rules, in order:
 *
 *  1. A unit never receives more than one discount. When several rewards
 *     reach the same unit the best one wins — they do not compound.
 *     (Four "50% off" rewards used to compound to 93.75% off; they now cap
 *     at 50%.)
 *  2. A product_discount reward reaches at most `maxUnits` units across the
 *     whole cart — three shirts under a "50% off one" promotion get one
 *     discounted unit between them, not one per line.
 *  3. Bundle ("3 for ₪200") and buy_get ("buy a winter item, get a summer item
 *     free") rewards *claim* units: the units inside a bundle, and both the
 *     bought and the discounted units of a buy_get, take part in that one
 *     promotion and nothing else. Both always take the *cheapest* qualifying
 *     units, as the store asked: a bundle is built from the cheapest units
 *     (and only when that actually saves money), and a buy_get discounts the
 *     cheapest units it can.
 *  4. An `exclusive` promotion (the default) applies on its own: it never
 *     shares a product with another promotion. Promotions marked stackable may
 *     share.
 *  5. At most one cart-wide discount applies — whichever is worth the most.
 *  6. Free shipping is granted if any qualifying promotion grants it.
 *
 * Rules 3 and 4 are resolved by search rather than by priority. Every order in
 * which the bundle / buy_get promotions could claim units (including leaving
 * any of them out) is tried; for each, every product then gets the cheapest
 * legal combination of product discounts — each exclusive promotion alone, or
 * all the stackable ones together. The cheapest plan for the shopper wins.
 * Letting the "first" promotion claim a product meant switching on a small
 * offer could knock out a broader one and *raise* the price — a merchant
 * turning a promotion on must never cost a shopper money.
 */

export interface PricedLine {
  productId: string;
  price: number;
  quantity: number;
}

/** A run of units on one line that are all charged the same price. */
export interface LineBucket {
  quantity: number;
  /** what each of these units is actually charged */
  unitPrice: number;
  /** 0 when these units carry no discount; not always whole (a bundle's share) */
  discountPct: number;
  promotionName?: string;
}

export interface LinePricing {
  /**
   * Every unit of the line, grouped by the price it is charged, deepest
   * discount first. Quantities sum to the line's quantity. This is the exact
   * record — the fields below it are convenience summaries for the UI.
   */
  buckets: LineBucket[];
  /** the deepest % off reaching this line (0 when none) */
  discountPct: number;
  /** how many of this line's units carry any discount */
  discountedUnits: number;
  /** unit price at `discountPct` */
  discountedUnitPrice: number;
  /** what the line costs once discounts are applied */
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
  /** itemSubtotal − subtotal */
  cartDiscount: number;
  /** the promotion behind `cartDiscount`, if any */
  cartDiscountName?: string;
  /** rawSubtotal − subtotal */
  savings: number;
  freeShipping: boolean;
  /** which delivery the free-shipping promotions cover together; null = none */
  freeShippingScope: FreeShippingScope | null;
}

/** A single product_discount reward, normalised into something allocatable. */
interface Offer {
  productId: string;
  pct: number;
  /** Infinity when the reward is uncapped */
  maxUnits: number;
  promotionId: string;
  promotionName: string;
  exclusive: boolean;
}

/** A bundle or buy_get reward, normalised. */
type MultiOffer = {
  promotionId: string;
  promotionName: string;
  exclusive: boolean;
  buy: Set<string>;
  buyQuantity: number;
  /** Infinity when the reward is uncapped */
  maxApplications: number;
} & (
  | { type: "bundle"; bundlePrice: number }
  | { type: "buy_get"; get: Set<string>; getQuantity: number; pct: number }
);

/** One unit of one cart line, and what it ended up being charged. */
interface Unit {
  lineIndex: number;
  productId: string;
  price: number;
  charged: number;
  /** the advertised % off (a bundle's is its effective share, so not always whole) */
  pct: number;
  promotionName?: string;
  /** taken by a bundle / buy_get, so nothing else may touch it */
  claimed: boolean;
}

/** Which promotions have touched a product so far in one plan. */
type Touches = Map<string, { ids: Set<string>; exclusive: boolean }>;

const clampPct = (pct: number) => Math.max(0, Math.min(100, pct));

const unitPriceAt = (price: number, pct: number) =>
  pct > 0 ? Math.max(0, Math.round(price * (1 - pct / 100))) : price;

/** Above this many bundle / buy_get promotions the plan search stops being exhaustive. */
const MAX_SEARCHED_MULTI_OFFERS = 5;

/**
 * Rewards are keyed by promotion, so two promotions granting "50% off the same
 * shirt" stay distinguishable. A reward with no promotionId (older cached carts)
 * is treated as its own exclusive promotion, which is the cautious reading.
 */
function toOffers(rewards: AppliedReward[]): Offer[] {
  const offers: Offer[] = [];
  rewards.forEach((r, i) => {
    if (r.type !== "product_discount" || !r.productId) return;
    const pct = clampPct(r.discountPct ?? 0);
    if (pct <= 0) return;
    offers.push({
      productId: r.productId,
      pct,
      maxUnits: r.maxUnits && r.maxUnits > 0 ? r.maxUnits : Infinity,
      promotionId: r.promotionId ?? `reward:${i}`,
      promotionName: r.promotionName,
      exclusive: r.exclusive ?? true,
    });
  });
  // Best offer first, so the deepest discount claims the units it can reach.
  // Ties break on name then product id purely to keep the result deterministic.
  return offers.sort(
    (a, b) =>
      b.pct - a.pct ||
      a.promotionName.localeCompare(b.promotionName) ||
      a.productId.localeCompare(b.productId)
  );
}

function toMultiOffers(rewards: AppliedReward[]): MultiOffer[] {
  const offers: MultiOffer[] = [];
  rewards.forEach((r, i) => {
    if (r.type !== "bundle" && r.type !== "buy_get") return;
    const buyQuantity = Math.floor(r.buyQuantity ?? 0);
    if (buyQuantity < 1 || !r.buyProductIds?.length) return;
    const base = {
      promotionId: r.promotionId ?? `reward:${i}`,
      promotionName: r.promotionName,
      exclusive: r.exclusive ?? true,
      buy: new Set(r.buyProductIds),
      buyQuantity,
      maxApplications: r.maxApplications && r.maxApplications > 0 ? r.maxApplications : Infinity,
    };
    if (r.type === "bundle") {
      if (r.bundlePrice == null || r.bundlePrice < 0) return;
      offers.push({ ...base, type: "bundle", bundlePrice: r.bundlePrice });
    } else {
      const getQuantity = Math.floor(r.getQuantity ?? 0);
      const pct = clampPct(r.discountPct ?? 0);
      if (getQuantity < 1 || pct <= 0 || !r.getProductIds?.length) return;
      offers.push({ ...base, type: "buy_get", get: new Set(r.getProductIds), getQuantity, pct });
    }
  });
  return offers.sort((a, b) => a.promotionName.localeCompare(b.promotionName) || a.promotionId.localeCompare(b.promotionId));
}

/** Every ordered selection of the offers, the empty one first. */
function plansFor(offers: MultiOffer[]): MultiOffer[][] {
  if (offers.length > MAX_SEARCHED_MULTI_OFFERS) {
    // Too many to try every order: try none, each one alone, and all of them.
    return [[], ...offers.map((o) => [o]), offers];
  }
  const plans: MultiOffer[][] = [];
  const walk = (prefix: MultiOffer[], rest: MultiOffer[]) => {
    plans.push(prefix);
    rest.forEach((o, i) => walk([...prefix, o], [...rest.slice(0, i), ...rest.slice(i + 1)]));
  };
  walk([], offers);
  return plans;
}

/** Whether `promotionId` may still take units of `productId` under rule 4. */
function mayTouch(touches: Touches, productId: string, promotionId: string, exclusive: boolean) {
  const t = touches.get(productId);
  if (!t) return true;
  const others = [...t.ids].some((id) => id !== promotionId);
  if (!others) return true;
  return !t.exclusive && !exclusive;
}

function touch(touches: Touches, productId: string, promotionId: string, exclusive: boolean) {
  const t = touches.get(productId) ?? { ids: new Set<string>(), exclusive: false };
  t.ids.add(promotionId);
  t.exclusive ||= exclusive;
  touches.set(productId, t);
}

const cheapestFirst = (a: Unit, b: Unit) => a.price - b.price || a.lineIndex - b.lineIndex;

/**
 * Splits `total` across units in proportion to their prices, in whole
 * shekels, so the shares add up to exactly `total` and no unit is charged more
 * than its own price.
 */
function shareOut(total: number, units: Unit[]): number[] {
  const sum = units.reduce((s, u) => s + u.price, 0);
  const exact = units.map((u) => (sum > 0 ? (total * u.price) / sum : 0));
  const shares = exact.map(Math.floor);
  let left = total - shares.reduce((s, x) => s + x, 0);
  const byRemainder = exact.map((x, i) => ({ i, r: x - Math.floor(x) })).sort((a, b) => b.r - a.r || a.i - b.i);
  for (const { i } of byRemainder) {
    if (left <= 0) break;
    if (shares[i] + 1 > units[i].price) continue;
    shares[i] += 1;
    left -= 1;
  }
  return shares;
}

/**
 * Forms as many bundles as the cart allows from the cheapest available units —
 * the store's rule is that the cheapest items are always the ones included.
 * The bundles' combined price is shared over all their units together, so a
 * cheap first bundle never charges a unit more than its own price. When even
 * that would not save money (three ₪50 items under "3 for ₪200"), fewer
 * bundles are tried, and none are formed if none save anything.
 */
function applyBundle(offer: Extract<MultiOffer, { type: "bundle" }>, available: Unit[]): Unit[] {
  const pool = available.filter((u) => offer.buy.has(u.productId)).sort(cheapestFirst);
  const most = Math.min(offer.maxApplications, Math.floor(pool.length / offer.buyQuantity));
  for (let k = most; k >= 1; k--) {
    const group = pool.slice(0, k * offer.buyQuantity);
    const total = k * offer.bundlePrice;
    if (group.reduce((s, u) => s + u.price, 0) <= total) continue;
    shareOut(total, group).forEach((charged, i) => {
      const u = group[i];
      u.charged = charged;
      u.pct = u.price > 0 ? (1 - charged / u.price) * 100 : 0;
      u.promotionName = offer.promotionName;
    });
    return group;
  }
  return [];
}

/**
 * Applies a buy_get as many times as the cart allows. The discounted units are
 * the cheapest the shopper qualifies for; when the two lists overlap, a unit
 * cannot pay for its own discount, so fewer overlapping units may be picked.
 */
function applyBuyGet(offer: Extract<MultiOffer, { type: "buy_get" }>, available: Unit[]): Unit[] {
  const { buyQuantity: N, getQuantity: M } = offer;
  const buyOnly = available.filter((u) => offer.buy.has(u.productId) && !offer.get.has(u.productId));
  const both = available.filter((u) => offer.buy.has(u.productId) && offer.get.has(u.productId));
  const getEligible = available.filter((u) => offer.get.has(u.productId)).sort(cheapestFirst);

  const buyEligible = buyOnly.length + both.length;
  const upper = Math.min(
    offer.maxApplications,
    Math.floor(getEligible.length / M),
    Math.floor(buyEligible / N),
    Math.floor(new Set([...buyOnly, ...getEligible]).size / (N + M))
  );

  for (let k = upper; k >= 1; k--) {
    // Overlapping units handed out as "get" stop counting towards "buy".
    const overlapCap = buyEligible - k * N;
    if (overlapCap < 0) continue;
    const gets: Unit[] = [];
    let overlapTaken = 0;
    for (const u of getEligible) {
      if (gets.length === k * M) break;
      if (offer.buy.has(u.productId)) {
        if (overlapTaken >= overlapCap) continue;
        overlapTaken++;
      }
      gets.push(u);
    }
    if (gets.length < k * M) continue;

    const buys = [...buyOnly, ...both].filter((u) => !gets.includes(u)).sort(cheapestFirst).slice(0, k * N);
    for (const u of gets) {
      u.charged = unitPriceAt(u.price, offer.pct);
      u.pct = offer.pct;
      u.promotionName = offer.promotionName;
    }
    return [...gets, ...buys];
  }
  return [];
}

/**
 * Spends one set of offers over one product's units. Deepest discount first,
 * cheapest unit first — the store's rule is that a capped discount always
 * reaches the cheapest items — and a unit already discounted is never
 * revisited, so offers within a set fill each other's gaps instead of
 * compounding.
 */
function spend(offers: Offer[], units: Unit[]): { pct: number; promotionName?: string }[] {
  const out = units.map(() => ({ pct: 0 }) as { pct: number; promotionName?: string });
  const order = units
    .map((u, index) => ({ price: u.price, index }))
    .sort((a, b) => a.price - b.price || a.index - b.index);

  for (const offer of offers) {
    let taken = 0;
    for (const { index } of order) {
      if (taken >= offer.maxUnits) break;
      if (out[index].pct > 0) continue;
      out[index] = { pct: offer.pct, promotionName: offer.promotionName };
      taken++;
    }
  }
  return out;
}

/** Hands out product discounts over the units no bundle / buy_get has claimed. */
function applyProductDiscounts(units: Unit[], offers: Offer[], touches: Touches) {
  const byProduct = new Map<string, Unit[]>();
  for (const u of units) {
    if (u.claimed) continue;
    const bucket = byProduct.get(u.productId) ?? [];
    bucket.push(u);
    byProduct.set(u.productId, bucket);
  }

  for (const [productId, productUnits] of byProduct) {
    const forProduct = offers.filter((o) => o.productId === productId && mayTouch(touches, productId, o.promotionId, o.exclusive));
    if (forProduct.length === 0) continue;

    // The legal combinations: every stackable promotion together, or any one
    // exclusive promotion on its own. A promotion's own rewards always travel
    // together — sharing with yourself is not sharing.
    const candidates: Offer[][] = [];
    const stackable = forProduct.filter((o) => !o.exclusive);
    if (stackable.length > 0) candidates.push(stackable);
    for (const promotionId of [...new Set(forProduct.filter((o) => o.exclusive).map((o) => o.promotionId))].sort()) {
      candidates.push(forProduct.filter((o) => o.promotionId === promotionId));
    }

    // Cheapest for the shopper wins. Ties keep the earlier candidate, and the
    // candidate order above is fixed, so the outcome is deterministic.
    let best: { pct: number; promotionName?: string }[] | null = null;
    let bestCost = Infinity;
    for (const candidate of candidates) {
      const assignment = spend(candidate, productUnits);
      const cost = assignment.reduce((sum, a, i) => sum + unitPriceAt(productUnits[i].price, a.pct), 0);
      if (cost < bestCost) {
        bestCost = cost;
        best = assignment;
      }
    }
    if (!best) continue;

    best.forEach((a, i) => {
      if (a.pct <= 0) return;
      productUnits[i].charged = unitPriceAt(productUnits[i].price, a.pct);
      productUnits[i].pct = a.pct;
      productUnits[i].promotionName = a.promotionName;
    });
  }
}

/** Prices every unit under one plan: the given bundle / buy_get order, then product discounts. */
function runPlan(items: PricedLine[], plan: MultiOffer[], offers: Offer[]): Unit[] {
  const units: Unit[] = items.flatMap((item, lineIndex) =>
    Array.from({ length: Math.max(0, Math.floor(item.quantity)) }, () => ({
      lineIndex,
      productId: item.productId,
      price: item.price,
      charged: item.price,
      pct: 0,
      claimed: false,
    }))
  );
  const touches: Touches = new Map();

  for (const offer of plan) {
    const available = units.filter((u) => !u.claimed && mayTouch(touches, u.productId, offer.promotionId, offer.exclusive));
    const taken = offer.type === "bundle" ? applyBundle(offer, available) : applyBuyGet(offer, available);
    for (const u of taken) {
      u.claimed = true;
      touch(touches, u.productId, offer.promotionId, offer.exclusive);
    }
  }

  // Product discounts touch products too, but only at the very end, so they
  // never need recording: nothing after them can be blocked.
  applyProductDiscounts(units, offers, touches);
  return units;
}

/** Groups a line's units into one bucket per distinct price, deepest discount first. */
function toBuckets(units: Unit[]): LineBucket[] {
  const byKey = new Map<string, LineBucket>();
  for (const unit of units) {
    const key = `${unit.pct}|${unit.charged}|${unit.promotionName ?? ""}`;
    const bucket = byKey.get(key);
    if (bucket) {
      bucket.quantity += 1;
    } else {
      byKey.set(key, { quantity: 1, unitPrice: unit.charged, discountPct: unit.pct, promotionName: unit.promotionName });
    }
  }
  return [...byKey.values()].sort((a, b) => b.discountPct - a.discountPct);
}

export function promotionPricing(items: PricedLine[], rewards: AppliedReward[]): PromotionPricing {
  const offers = toOffers(rewards);

  // Cheapest plan wins; ties keep the earlier plan, and the plan order is
  // fixed (fewest promotions first), so the outcome is deterministic.
  let best: Unit[] = [];
  let bestCost = Infinity;
  for (const plan of plansFor(toMultiOffers(rewards))) {
    const units = runPlan(items, plan, offers);
    const cost = units.reduce((s, u) => s + u.charged, 0);
    if (cost < bestCost) {
      bestCost = cost;
      best = units;
    }
  }

  const lines: LinePricing[] = [];
  let rawSubtotal = 0;
  let itemSubtotal = 0;

  items.forEach((item, index) => {
    const buckets = toBuckets(best.filter((u) => u.lineIndex === index));
    const discounted = buckets.filter((b) => b.discountPct > 0);
    const deepest = discounted[0];

    const rawTotal = item.price * Math.max(0, Math.floor(item.quantity));
    const total = buckets.reduce((sum, b) => sum + b.unitPrice * b.quantity, 0);

    lines.push({
      buckets,
      discountPct: deepest?.discountPct ?? 0,
      discountedUnits: discounted.reduce((sum, b) => sum + b.quantity, 0),
      discountedUnitPrice: deepest?.unitPrice ?? item.price,
      total,
      rawTotal,
      // De-duplicated: one promotion covering several buckets is named once.
      promotionNames: [...new Set(discounted.map((b) => b.promotionName).filter((n): n is string => !!n))],
    });

    rawSubtotal += rawTotal;
    itemSubtotal += total;
  });

  // Cart-wide discounts do not stack either — the single most valuable one
  // applies, so two "50% off the cart" promotions cannot make a cart free.
  let cartDiscount = 0;
  let cartDiscountName: string | undefined;
  for (const r of rewards) {
    if (r.type !== "cart_discount") continue;
    const value = r.discountAmount && r.discountAmount > 0
      ? Math.min(r.discountAmount, itemSubtotal)
      : Math.round((itemSubtotal * clampPct(r.discountPct ?? 0)) / 100);
    if (value > cartDiscount) {
      cartDiscount = value;
      cartDiscountName = r.promotionName;
    }
  }

  const subtotal = Math.max(0, itemSubtotal - cartDiscount);

  return {
    lines,
    rawSubtotal,
    itemSubtotal,
    subtotal,
    cartDiscount: itemSubtotal - subtotal,
    cartDiscountName,
    savings: rawSubtotal - subtotal,
    freeShipping: rewards.some((r) => r.type === "free_shipping"),
    freeShippingScope: mergeScopes(rewards.filter((r) => r.type === "free_shipping").map((r) => r.shippingScope ?? "all")),
  };
}
