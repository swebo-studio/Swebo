import type { AppliedReward } from "./promotions";

/**
 * Pricing maths for a cart that has promotions applied to it. Used by the
 * cart, the checkout summary and the order route, so all three agree on the
 * numbers. Kept free of Prisma imports so the browser can use it too.
 *
 * The engine works on individual *units*, not on lines or on products, because
 * that is the only level at which "how many items actually got the discount"
 * is a well-defined question. The rules, in order:
 *
 *  1. A unit never receives more than one product discount. When several
 *     rewards reach the same unit the best one wins — they do not compound.
 *     (Four "50% off" rewards used to compound to 93.75% off; they now cap
 *     at 50%.)
 *  2. A product_discount reward reaches at most `maxUnits` units across the
 *     whole cart — three shirts under a "50% off one" promotion get one
 *     discounted unit between them, not one per line.
 *  3. An `exclusive` promotion (the default) owns the products it discounts:
 *     no other promotion may discount those products in the same cart.
 *  4. At most one cart-wide discount applies — whichever is worth the most.
 *  5. Free shipping is granted if any qualifying promotion grants it.
 *
 * Rules 1-4 are all "best one wins", so a shopper is never worse off than the
 * single best offer they qualify for, and never better off than it either.
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
  /** 0 when these units carry no discount */
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

/** One unit of one cart line, and the discount that ended up reaching it. */
interface Unit {
  lineIndex: number;
  price: number;
  pct: number;
  promotionName?: string;
}

const clampPct = (pct: number) => Math.max(0, Math.min(100, pct));

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

/**
 * Hands out product discounts unit by unit. Returns the units of every line,
 * each stamped with the discount (if any) that reached it.
 */
function allocateProductDiscounts(items: PricedLine[], rewards: AppliedReward[]): Unit[][] {
  const unitsByLine: Unit[][] = items.map((item, lineIndex) =>
    Array.from({ length: Math.max(0, Math.floor(item.quantity)) }, () => ({
      lineIndex,
      price: item.price,
      pct: 0,
    }))
  );

  const unitsByProduct = new Map<string, Unit[]>();
  items.forEach((item, lineIndex) => {
    const bucket = unitsByProduct.get(item.productId) ?? [];
    bucket.push(...unitsByLine[lineIndex]);
    unitsByProduct.set(item.productId, bucket);
  });

  /** productId → promotions that have already discounted it */
  const claimants = new Map<string, Set<string>>();
  /** productId → the promotion holding it exclusively */
  const exclusiveLock = new Map<string, string>();

  for (const offer of toOffers(rewards)) {
    const units = unitsByProduct.get(offer.productId);
    if (!units) continue;

    // Someone else already owns this product outright.
    const lock = exclusiveLock.get(offer.productId);
    if (lock && lock !== offer.promotionId) continue;

    // We want it to ourselves, but another promotion got here first.
    const others = [...(claimants.get(offer.productId) ?? [])].filter((id) => id !== offer.promotionId);
    if (offer.exclusive && others.length > 0) continue;

    // Only units that carry no discount yet are up for grabs — this is what
    // stops rewards compounding. Dearest units first, so a capped offer is
    // spent where it saves the shopper the most.
    const free = units.filter((u) => u.pct === 0).sort((a, b) => b.price - a.price);
    const take = Math.min(offer.maxUnits, free.length);
    if (take <= 0) continue;

    for (let i = 0; i < take; i++) {
      free[i].pct = offer.pct;
      free[i].promotionName = offer.promotionName;
    }

    const claimed = claimants.get(offer.productId) ?? new Set<string>();
    claimed.add(offer.promotionId);
    claimants.set(offer.productId, claimed);
    if (offer.exclusive) exclusiveLock.set(offer.productId, offer.promotionId);
  }

  return unitsByLine;
}

/** Groups a line's units into one bucket per distinct price, deepest discount first. */
function toBuckets(units: Unit[]): LineBucket[] {
  const byKey = new Map<string, LineBucket>();
  for (const unit of units) {
    const unitPrice = unit.pct > 0 ? Math.max(0, Math.round(unit.price * (1 - unit.pct / 100))) : unit.price;
    const key = `${unit.pct}|${unitPrice}|${unit.promotionName ?? ""}`;
    const bucket = byKey.get(key);
    if (bucket) {
      bucket.quantity += 1;
    } else {
      byKey.set(key, { quantity: 1, unitPrice, discountPct: unit.pct, promotionName: unit.promotionName });
    }
  }
  return [...byKey.values()].sort((a, b) => b.discountPct - a.discountPct);
}

export function promotionPricing(items: PricedLine[], rewards: AppliedReward[]): PromotionPricing {
  const unitsByLine = allocateProductDiscounts(items, rewards);

  const lines: LinePricing[] = [];
  let rawSubtotal = 0;
  let itemSubtotal = 0;

  items.forEach((item, index) => {
    const buckets = toBuckets(unitsByLine[index]);
    const discounted = buckets.filter((b) => b.discountPct > 0);
    const best = discounted[0];

    const rawTotal = item.price * Math.max(0, Math.floor(item.quantity));
    const total = buckets.reduce((sum, b) => sum + b.unitPrice * b.quantity, 0);

    lines.push({
      buckets,
      discountPct: best?.discountPct ?? 0,
      discountedUnits: discounted.reduce((sum, b) => sum + b.quantity, 0),
      discountedUnitPrice: best?.unitPrice ?? item.price,
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
  };
}
