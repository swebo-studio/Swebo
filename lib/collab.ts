import { prisma } from "@/lib/db";

/** The creator's cut of an order's items (after every discount, no delivery), to the agora. */
export function collabCommission(itemsTotal: number, pct: number): number {
  return Math.round(itemsTotal * pct) / 100;
}

/** ₪ amounts without a trailing ".00" */
export function shekels(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export interface CollabTotals {
  orders: number;
  /** Items after discounts, delivery excluded, across every paid order with the code */
  sales: number;
  earned: number;
  paid: number;
  due: number;
}

/**
 * What each creator code has earned and been paid, keyed by code. Only paid
 * orders count — an abandoned checkout or a cancelled order earns nothing.
 */
export async function collabTotals(coupons: { id: string; code: string }[]): Promise<Map<string, CollabTotals>> {
  const codes = coupons.map((c) => c.code);
  const [orderSums, payoutSums] = await Promise.all([
    prisma.order.groupBy({
      by: ["collabCode"],
      where: { collabCode: { in: codes }, status: "paid" },
      _sum: { subtotal: true, collabCommission: true },
      _count: true,
    }),
    prisma.collabPayout.groupBy({
      by: ["couponId"],
      where: { couponId: { in: coupons.map((c) => c.id) } },
      _sum: { amount: true },
    }),
  ]);
  const totals = new Map<string, CollabTotals>();
  for (const c of coupons) {
    const o = orderSums.find((s) => s.collabCode === c.code);
    const earned = round2(o?._sum.collabCommission ?? 0);
    const paid = round2(payoutSums.find((s) => s.couponId === c.id)?._sum.amount ?? 0);
    totals.set(c.code, {
      orders: o?._count ?? 0,
      sales: round2(o?._sum.subtotal ?? 0),
      earned,
      paid,
      due: round2(earned - paid),
    });
  }
  return totals;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
