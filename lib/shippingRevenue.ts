/**
 * What customers paid the shop for delivery, month by month — the fee on the
 * order (`Order.delivery`), which is already what was charged after free
 * shipping from promotions and coupons. Not what HFD charges the shop.
 *
 * Months follow Israel time and an order counts in the month it was placed.
 * A cancelled order was paid and then refunded, so its fee is counted as
 * collected and taken off again as a refund.
 */

/** "YYYY-MM" */
export type MonthKey = string;

export interface ShippingMonth {
  /** Delivery fees of every order paid this month, cancelled ones included. */
  collected: number;
  /** Delivery fees of this month's orders that were cancelled afterwards. */
  refunded: number;
  /** Paid orders this month with a delivery fee above 0. */
  paidShippingCount: number;
}

const monthFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jerusalem",
  year: "numeric",
  month: "2-digit",
});

/** The Israel-time month a moment falls in, as "YYYY-MM". */
export function monthKey(date: Date): MonthKey {
  const parts = monthFormat.formatToParts(date);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  return `${y}-${m}`;
}

export function shippingByMonth(
  orders: { status: string; delivery: number; createdAt: Date }[],
): Record<MonthKey, ShippingMonth> {
  const months: Record<MonthKey, ShippingMonth> = {};
  for (const o of orders) {
    if (o.status !== "paid" && o.status !== "cancelled") continue;
    const fee = o.delivery > 0 ? o.delivery : 0;
    const key = monthKey(o.createdAt);
    const m = (months[key] ??= { collected: 0, refunded: 0, paidShippingCount: 0 });
    m.collected += fee;
    if (o.status === "cancelled") m.refunded += fee;
    else if (fee > 0) m.paidShippingCount += 1;
  }
  return months;
}
