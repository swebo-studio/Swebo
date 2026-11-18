/**
 * Preorders: a product sold before it is in stock. The customer pays at
 * checkout as usual and the stock goes down (below 0 if need be — that is how
 * many units are owed). The order waits in the "preorder" stage, with no HFD
 * shipment, until an admin releases it from the orders page.
 *
 * A product may carry an estimated delivery date, a plain "YYYY-MM-DD" string
 * shown to customers. It is informational only — nothing ships on it.
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

/** The product's estimated delivery date, when it is a preorder and has one. */
export function preorderEstimate(p: { preorder?: boolean | null; preorderDate?: string | null }): string | null {
  return p.preorder && isIsoDate(p.preorderDate) ? p.preorderDate : null;
}

/** The preorder fields of a product save, checked. The date is optional. */
export function preorderInput(body: { preorder?: unknown; preorderDate?: unknown }):
  | { ok: true; data: { preorder?: boolean; preorderDate?: string | null } }
  | { ok: false; error: string } {
  if (body.preorder === undefined && body.preorderDate === undefined) return { ok: true, data: {} };
  const date = typeof body.preorderDate === "string" && body.preorderDate ? body.preorderDate : null;
  if (date !== null && !isIsoDate(date)) return { ok: false, error: "תאריך אספקה משוער לא תקין" };
  return { ok: true, data: { preorder: body.preorder === true, preorderDate: date } };
}
