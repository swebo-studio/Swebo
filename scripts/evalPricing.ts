/**
 * Property-based evals for the promotion pricing engine.
 *
 * Hand-written scenarios only cover the cases we thought of — and the 12 NIS
 * shirt was a case nobody thought of. So instead of asserting specific prices,
 * this generates thousands of random carts and promotion sets and asserts the
 * properties that must hold for *every* input. A counter-example is printed in
 * full so it can be pasted straight into a regression test.
 *
 *   npx tsx scripts/evalPricing.ts [runs]
 */
import { promotionPricing, type PricedLine } from "../lib/cartPricing";
import type { AppliedReward } from "../lib/promotions";

// Deterministic RNG, so a failure is always reproducible from its seed.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const PRODUCTS = ["shirt", "shorts", "jacket"];
const PRICES = [1, 50, 99, 159, 199, 249, 1499];

interface Scenario {
  seed: number;
  items: PricedLine[];
  rewards: AppliedReward[];
}

function generate(seed: number): Scenario {
  const r = rng(seed);
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const int = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));

  const items: PricedLine[] = Array.from({ length: int(1, 4) }, () => ({
    productId: pick(PRODUCTS),
    price: pick(PRICES),
    quantity: int(1, 4),
  }));

  const rewards: AppliedReward[] = Array.from({ length: int(0, 5) }, (_, i) => {
    const roll = r();
    // Distinct promotion ids and names, so attribution is unambiguous.
    const base = { promotionId: `p${i}`, promotionName: `P${i}`, exclusive: r() < 0.6 };
    if (roll < 0.65) {
      return {
        ...base,
        type: "product_discount" as const,
        productId: pick(PRODUCTS),
        discountPct: pick([5, 10, 25, 50, 75, 100]),
        maxUnits: r() < 0.5 ? int(1, 3) : undefined,
      };
    }
    if (roll < 0.9) {
      return r() < 0.5
        ? { ...base, type: "cart_discount" as const, discountPct: pick([5, 10, 30, 50, 100]) }
        : { ...base, type: "cart_discount" as const, discountAmount: pick([10, 50, 500, 99999]) };
    }
    return { ...base, type: "free_shipping" as const };
  });

  return { seed, items, rewards };
}

type Violation = { property: string; detail: string };

function checkProperties({ items, rewards }: Scenario): Violation[] {
  const bad: Violation[] = [];
  const p = promotionPricing(items, rewards);
  const fail = (property: string, detail: string) => bad.push({ property, detail });

  // --- structural integrity -------------------------------------------------
  p.lines.forEach((line, i) => {
    const item = items[i];
    const units = line.buckets.reduce((s, b) => s + b.quantity, 0);
    if (units !== item.quantity) fail("buckets account for every unit", `line ${i}: ${units} vs ${item.quantity}`);
    const sum = line.buckets.reduce((s, b) => s + b.unitPrice * b.quantity, 0);
    if (sum !== line.total) fail("buckets sum to line total", `line ${i}: ${sum} vs ${line.total}`);
    for (const b of line.buckets) {
      if (b.unitPrice < 0) fail("no negative unit price", `line ${i}: ${b.unitPrice}`);
      if (b.unitPrice > item.price) fail("discount never raises a unit price", `line ${i}: ${b.unitPrice} > ${item.price}`);
    }
  });

  const itemSum = p.lines.reduce((s, l) => s + l.total, 0);
  if (itemSum !== p.itemSubtotal) fail("lines sum to itemSubtotal", `${itemSum} vs ${p.itemSubtotal}`);
  if (p.subtotal < 0) fail("subtotal never negative", `${p.subtotal}`);
  if (p.subtotal > p.rawSubtotal) fail("subtotal never exceeds raw", `${p.subtotal} > ${p.rawSubtotal}`);
  if (p.savings !== p.rawSubtotal - p.subtotal) fail("savings is consistent", `${p.savings}`);

  // --- the anti-compounding property ---------------------------------------
  // No unit may be discounted deeper than the single best offer on its product.
  const bestPct = new Map<string, number>();
  for (const r of rewards) {
    if (r.type !== "product_discount" || !r.productId) continue;
    bestPct.set(r.productId, Math.max(bestPct.get(r.productId) ?? 0, Math.min(100, r.discountPct ?? 0)));
  }
  p.lines.forEach((line, i) => {
    const cap = bestPct.get(items[i].productId) ?? 0;
    for (const b of line.buckets) {
      if (b.discountPct > cap) fail("discounts never compound", `line ${i}: ${b.discountPct}% > best offer ${cap}%`);
    }
  });

  // --- per-promotion unit budgets ------------------------------------------
  const used = new Map<string, number>();
  p.lines.forEach((line) => {
    for (const b of line.buckets) {
      if (!b.promotionName) continue;
      used.set(b.promotionName, (used.get(b.promotionName) ?? 0) + b.quantity);
    }
  });
  for (const r of rewards) {
    if (r.type !== "product_discount" || !r.maxUnits) continue;
    const spent = used.get(r.promotionName) ?? 0;
    if (spent > r.maxUnits) fail("maxUnits budget respected", `${r.promotionName}: ${spent} > ${r.maxUnits}`);
  }

  // --- exclusivity ----------------------------------------------------------
  const namesByProduct = new Map<string, Set<string>>();
  p.lines.forEach((line, i) => {
    const set = namesByProduct.get(items[i].productId) ?? new Set<string>();
    line.buckets.forEach((b) => b.promotionName && set.add(b.promotionName));
    namesByProduct.set(items[i].productId, set);
  });
  for (const r of rewards) {
    if (r.type !== "product_discount" || !r.exclusive || !r.productId) continue;
    const names = namesByProduct.get(r.productId);
    if (names?.has(r.promotionName) && names.size > 1) {
      fail("exclusive promotion is alone on its product", `${r.productId}: ${[...names].join(", ")}`);
    }
  }

  // --- one cart-wide discount ----------------------------------------------
  const bestCart = rewards
    .filter((r) => r.type === "cart_discount")
    .reduce((max, r) => {
      const v = r.discountAmount && r.discountAmount > 0
        ? Math.min(r.discountAmount, p.itemSubtotal)
        : Math.round((p.itemSubtotal * Math.min(100, r.discountPct ?? 0)) / 100);
      return Math.max(max, v);
    }, 0);
  if (p.cartDiscount !== bestCart) fail("exactly the best cart discount applies", `${p.cartDiscount} vs ${bestCart}`);

  // --- determinism ----------------------------------------------------------
  if (JSON.stringify(promotionPricing(items, rewards)) !== JSON.stringify(p)) {
    fail("pricing is deterministic", "two identical calls disagreed");
  }

  // --- monotonicity ---------------------------------------------------------
  // Removing a promotion must never make the cart cheaper. Equivalently: adding
  // an offer can only ever help the shopper. A merchant switching a promotion on
  // should not be able to raise anyone's price.
  rewards.forEach((_, i) => {
    const without = promotionPricing(items, rewards.filter((_, j) => j !== i));
    if (without.subtotal < p.subtotal) {
      fail("adding a promotion never raises the price", `dropping ${rewards[i].promotionName} gives ${without.subtotal} < ${p.subtotal}`);
    }
  });

  return bad;
}

const runs = Number(process.argv[2] ?? 5000);
const byProperty = new Map<string, { count: number; example: Scenario; detail: string }>();

for (let seed = 1; seed <= runs; seed++) {
  const scenario = generate(seed);
  for (const v of checkProperties(scenario)) {
    const hit = byProperty.get(v.property);
    if (hit) hit.count++;
    else byProperty.set(v.property, { count: 1, example: scenario, detail: v.detail });
  }
}

const PROPERTIES = [
  "buckets account for every unit", "buckets sum to line total", "no negative unit price",
  "discount never raises a unit price", "lines sum to itemSubtotal", "subtotal never negative",
  "subtotal never exceeds raw", "savings is consistent", "discounts never compound",
  "maxUnits budget respected", "exclusive promotion is alone on its product",
  "exactly the best cart discount applies", "pricing is deterministic",
  "adding a promotion never raises the price",
];

console.log(`${runs} random scenarios\n`);
for (const name of PROPERTIES) {
  const v = byProperty.get(name);
  console.log(`  ${v ? "FAIL" : "ok  "}  ${name}${v ? `  (${v.count} counter-examples)` : ""}`);
}

if (byProperty.size > 0) {
  for (const [name, v] of byProperty) {
    console.log(`\n--- ${name} ---\n${v.detail}\nseed ${v.example.seed}`);
    console.log(`items:   ${JSON.stringify(v.example.items)}`);
    console.log(`rewards: ${JSON.stringify(v.example.rewards)}`);
  }
  process.exit(1);
}
console.log("\nAll properties hold.");
