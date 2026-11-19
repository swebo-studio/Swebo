/**
 * Preorders: a product sold before it ships, from stock known in advance. The
 * customer pays at checkout as usual and the stock goes down, never below 0 —
 * at 0 it is sold out like any product. The order waits in the "preorder" stage, with no HFD
 * shipment, until an admin releases it from the orders page.
 *
 * A product may carry an estimated arrival range, from preorderDate to
 * preorderDateTo (plain "YYYY-MM-DD" strings, either one optional), shown to
 * customers as an estimate. It is informational only — nothing ships on it.
 * Pure helpers: safe to import from client components.
 */

/** Order.orderStage of a paid preorder that has not been released yet. */
export const PREORDER_STAGE = "preorder";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** "2026-12-01" → "01/12/2026" */
export function formatShipDate(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

/** A product that sells as a preorder right now. */
export function isPreorder(p: { preorder?: boolean | null }): boolean {
  return !!p.preorder;
}

/** "2026-12-10" → "10.12", or "10.12.2026" with the year. */
function shortDate(date: string, withYear: boolean): string {
  const [y, m, d] = date.split("-");
  return withYear ? `${d}.${m}.${y}` : `${d}.${m}`;
}

/**
 * "10.12–20.12" for a range, "10.12" for a single date. The years show only
 * when the range crosses into the next year, so it never reads ambiguously.
 */
export function formatPreorderRange(from: string | null, to: string | null): string | null {
  const a = isIsoDate(from) ? from : null;
  const b = isIsoDate(to) ? to : null;
  if (a && b && a !== b) {
    const withYear = a.slice(0, 4) !== b.slice(0, 4);
    return `${shortDate(a, withYear)}–${shortDate(b, withYear)}`;
  }
  const one = a ?? b;
  return one ? shortDate(one, false) : null;
}

/** Shown next to every estimate, so no one reads it as a promise. */
export const ESTIMATE_NOTE = "מועד משוער בלבד ואינו מובטח";

/**
 * The product's estimated arrival as customers see it ("10.12–20.12"), when it
 * is a preorder and has one.
 */
export function preorderEstimate(p: { preorder?: boolean | null; preorderDate?: string | null; preorderDateTo?: string | null }): string | null {
  return p.preorder ? formatPreorderRange(p.preorderDate ?? null, p.preorderDateTo ?? null) : null;
}

/** The preorder fields of a product save, checked. Both dates are optional. */
export function preorderInput(body: { preorder?: unknown; preorderDate?: unknown; preorderDateTo?: unknown }):
  | { ok: true; data: { preorder?: boolean; preorderDate?: string | null; preorderDateTo?: string | null } }
  | { ok: false; error: string } {
  if (body.preorder === undefined && body.preorderDate === undefined && body.preorderDateTo === undefined) return { ok: true, data: {} };
  const date = (v: unknown) => (typeof v === "string" && v ? v : null);
  const from = date(body.preorderDate);
  const to = date(body.preorderDateTo);
  if ((from !== null && !isIsoDate(from)) || (to !== null && !isIsoDate(to))) {
    return { ok: false, error: "תאריך אספקה משוער לא תקין" };
  }
  if (from && to && to < from) return { ok: false, error: "תאריך הסיום של הצפי לפני תאריך ההתחלה" };
  return { ok: true, data: { preorder: body.preorder === true, preorderDate: from, preorderDateTo: to } };
}
