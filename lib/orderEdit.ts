import { prisma } from "@/lib/db";
import { snapshotImage } from "@/lib/orderItem";

/**
 * An admin's edit of a placed order: customer details, delivery, and the lines
 * themselves (swap a product, colour or size, change quantities and prices,
 * add or remove lines). Everything is saved on the same order in one
 * transaction, so it either all lands or nothing does.
 *
 * Stock: a paid order already took its stock (see fulfillPaidOrder), so the
 * edit moves stock by the difference — a removed or reduced line puts its
 * units back, an added or increased one takes them, and the edit is refused
 * when the stock is not there. Unpaid orders take nothing until payment, and
 * cancelled or failed ones never take it again, so their edits leave stock
 * alone.
 *
 * Money: lines keep a unit price each (editable). The order's discount — the
 * coupon's share, which is not on any line — stays as a separate amount, so
 * subtotal = lines − discount and total = subtotal + delivery, the same sums
 * checkout makes. Editing never charges or refunds the customer: that stays in
 * Hyp.
 */

const MAX_LINES = 50;
const MAX_TEXT = 120;

export interface EditLineInput {
  /** An existing line of this order; absent for a new one */
  id?: string;
  /** null only on an existing line whose product was deleted */
  productId: string | null;
  color: string | null;
  size: string;
  quantity: number;
  price: number;
}

export interface OrderEditInput {
  customer: { name: string; email: string; phone: string; address: string; city: string; floor: string | null; apartment: string | null };
  deliveryMode: "home" | "epost" | "self";
  pudoCodeDestination: string | null;
  pudoPointName: string | null;
  delivery: number;
  discount: number;
  items: EditLineInput[];
}

export class OrderEditError extends Error {}

const text = (v: unknown, max = MAX_TEXT) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const money = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100_000 ? Math.round(v * 100) / 100 : null);

/** The request body, checked. Returns an error message for the admin when it is not usable. */
export function parseOrderEdit(body: unknown): { ok: true; input: OrderEditInput } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const c = (b.customer ?? {}) as Record<string, unknown>;
  const customer = {
    name: text(c.name, 60),
    email: text(c.email),
    phone: text(c.phone, 20),
    address: text(c.address, 200),
    city: text(c.city),
    floor: text(c.floor, 20) || null,
    apartment: text(c.apartment, 20) || null,
  };
  if (!customer.name) return { ok: false, error: "חסר שם לקוח" };
  if (!/^[\d\s()+-]{9,20}$/.test(customer.phone)) return { ok: false, error: "מספר טלפון לא תקין" };
  if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) return { ok: false, error: "כתובת אימייל לא תקינה" };

  const deliveryMode = (["home", "epost", "self"] as const).find((m) => m === b.deliveryMode);
  if (!deliveryMode) return { ok: false, error: "שיטת משלוח לא תקינה" };
  if (deliveryMode === "home" && (!customer.address || !customer.city)) return { ok: false, error: "למשלוח עד הבית צריך כתובת ועיר" };
  const pudoCodeDestination = text(b.pudoCodeDestination, 40) || null;
  const pudoPointName = text(b.pudoPointName) || null;
  if (deliveryMode === "epost" && !pudoCodeDestination) return { ok: false, error: "לנקודת איסוף צריך קוד נקודה" };

  const delivery = money(b.delivery);
  const discount = money(b.discount ?? 0);
  if (delivery === null) return { ok: false, error: "דמי משלוח לא תקינים" };
  if (discount === null) return { ok: false, error: "הנחה לא תקינה" };

  const rawItems = Array.isArray(b.items) ? b.items : [];
  if (rawItems.length === 0) return { ok: false, error: "בהזמנה חייב להיות לפחות פריט אחד" };
  if (rawItems.length > MAX_LINES) return { ok: false, error: "יותר מדי פריטים" };
  const items: EditLineInput[] = [];
  for (const raw of rawItems as Record<string, unknown>[]) {
    const quantity = raw.quantity;
    if (!Number.isInteger(quantity) || (quantity as number) < 1 || (quantity as number) > 100) return { ok: false, error: "כמות לא תקינה" };
    const price = money(raw.price);
    if (price === null) return { ok: false, error: "מחיר לא תקין" };
    const id = typeof raw.id === "string" && raw.id ? raw.id : undefined;
    const productId = typeof raw.productId === "string" && raw.productId ? raw.productId : null;
    if (!productId && !id) return { ok: false, error: "יש לבחור מוצר לכל פריט חדש" };
    items.push({
      id,
      productId,
      color: text(raw.color) || null,
      size: text(raw.size, 40),
      quantity: quantity as number,
      price,
    });
  }
  return { ok: true, input: { customer, deliveryMode, pudoCodeDestination, pudoPointName, delivery, discount, items } };
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
type StockKey = { productId: string; color: string | null; size: string };

/**
 * Moves stock for one product/colour/size by `delta` (positive returns units,
 * negative takes them), with the same row choice fulfillPaidOrder makes. A
 * take only succeeds when the stock is there, checked in the UPDATE itself.
 */
async function moveStock(tx: Tx, key: StockKey, delta: number, label: string) {
  if (delta === 0) return;
  const take = delta < 0;
  const n = Math.abs(delta);
  const colorRow = key.color
    ? await tx.productColor.findFirst({ where: { productId: key.productId, nameHe: key.color }, include: { sizes: true } })
    : null;

  if (colorRow) {
    if (colorRow.sizes.length > 0) {
      const sizeRow = colorRow.sizes.find((s) => s.size === key.size);
      if (!sizeRow) {
        // A size since removed from the product: nothing to put back into
        if (take) throw new OrderEditError(`המידה ${key.size} לא קיימת ב${label}`);
        return;
      }
      const res = await tx.productColorSize.updateMany({
        where: { id: sizeRow.id, ...(take ? { stock: { gte: n } } : {}) },
        data: { stock: take ? { decrement: n } : { increment: n } },
      });
      if (res.count === 0) throw new OrderEditError(`אין מספיק מלאי ל${label} (${key.color} / מידה ${key.size}) — נותרו ${sizeRow.stock}`);
      // The colour total mirrors its sizes (informational)
      await tx.productColor.update({ where: { id: colorRow.id }, data: { stock: take ? { decrement: n } : { increment: n } } });
      return;
    }
    const res = await tx.productColor.updateMany({
      where: { id: colorRow.id, ...(take ? { stock: { gte: n } } : {}) },
      data: { stock: take ? { decrement: n } : { increment: n } },
    });
    if (res.count === 0) throw new OrderEditError(`אין מספיק מלאי ל${label} (${key.color}) — נותרו ${colorRow.stock}`);
    return;
  }

  const res = await tx.product.updateMany({
    where: { id: key.productId, ...(take ? { stock: { gte: n } } : {}) },
    data: { stock: take ? { decrement: n } : { increment: n } },
  });
  if (res.count === 0) {
    if (!take) return; // product gone
    const p = await tx.product.findUnique({ where: { id: key.productId }, select: { stock: true } });
    throw new OrderEditError(`אין מספיק מלאי ל${label} — נותרו ${p?.stock ?? 0}`);
  }
}

const stockKey = (k: StockKey) => `${k.productId}\u0000${k.color ?? ""}\u0000${k.size}`;

export async function applyOrderEdit(orderId: string, input: OrderEditInput) {
  return prisma.$transaction(async (tx) => {
    // Locks the order row, so two admins saving at once queue up instead of
    // both moving stock off the same starting lines
    await tx.$executeRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw new OrderEditError("ההזמנה לא נמצאה");
    const existing = new Map(order.items.map((i) => [i.id, i]));

    const productIds = [...new Set(input.items.map((i) => i.productId).filter((id): id is string => !!id))];
    const products = await tx.product.findMany({
      where: { id: { in: productIds } },
      include: { colors: { include: { sizes: true, images: true } } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Each line as it will be saved
    const lines = input.items.map((line) => {
      const before = line.id ? existing.get(line.id) : undefined;
      if (line.id && !before) throw new OrderEditError("פריט לא שייך להזמנה הזו — רעננו את הדף ונסו שוב");

      if (!line.productId) {
        // A deleted product's line: it keeps what it was, only its quantity
        // and price can change
        if (before!.productId) throw new OrderEditError("יש לבחור מוצר לכל פריט");
        return {
          id: before!.id, productId: null, productName: before!.productName, productImage: before!.productImage,
          color: before!.color, size: before!.size, quantity: line.quantity, price: line.price, preorder: before!.preorder,
        };
      }

      const product = productMap.get(line.productId);
      if (!product) throw new OrderEditError("מוצר לא נמצא");
      // A line left as it was is not re-checked against the product: its
      // colour or size may have been renamed since, and that must not block
      // fixing a phone number
      const untouched = before && before.productId === line.productId && before.color === line.color && before.size === line.size;
      let color = line.color;
      if (untouched) {
        // keep as bought
      } else if (product.colors.length > 0) {
        const colorRow = product.colors.find((c) => c.nameHe === color);
        if (!colorRow) throw new OrderEditError(`יש לבחור צבע ל${product.nameHe}`);
        if (colorRow.sizes.length > 0 && !colorRow.sizes.some((s) => s.size === line.size)) {
          throw new OrderEditError(`יש לבחור מידה ל${product.nameHe} (${colorRow.nameHe})`);
        }
      } else {
        color = null;
      }
      // Same product and colour as before: keep the copy taken at purchase
      const unchanged = before && before.productId === product.id && before.color === color;
      return {
        id: before?.id,
        productId: product.id,
        productName: unchanged && before.productName ? before.productName : product.nameHe,
        productImage: unchanged && before.productImage ? before.productImage : snapshotImage(product, color),
        color,
        size: line.size,
        quantity: line.quantity,
        price: line.price,
        preorder: unchanged ? before.preorder : product.preorder,
      };
    });

    // Stock moves by the difference, only for an order that took its stock
    if (order.status === "paid") {
      const delta = new Map<string, { key: StockKey; n: number; label: string }>();
      const add = (k: StockKey, n: number, label: string) => {
        const id = stockKey(k);
        const cur = delta.get(id) ?? { key: k, n: 0, label };
        cur.n += n;
        delta.set(id, cur);
      };
      for (const old of order.items) {
        if (old.productId) add({ productId: old.productId, color: old.color, size: old.size }, old.quantity, old.productName);
      }
      for (const l of lines) {
        if (l.productId) add({ productId: l.productId, color: l.color, size: l.size }, -l.quantity, l.productName);
      }
      const moves = [...delta.values()].filter((d) => d.n !== 0);
      // Returns first, so swapping a size for another of the same row nets out
      for (const d of moves.filter((m) => m.n > 0)) await moveStock(tx, d.key, d.n, d.label);
      for (const d of moves.filter((m) => m.n < 0)) await moveStock(tx, d.key, d.n, d.label);
    }

    const linesTotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
    const discount = Math.min(input.discount, linesTotal);
    const subtotal = Math.round((linesTotal - discount) * 100) / 100;
    const total = Math.round((subtotal + input.delivery) * 100) / 100;

    const keptIds = new Set(lines.map((l) => l.id).filter(Boolean));
    await tx.orderItem.deleteMany({ where: { orderId, id: { notIn: [...keptIds] as string[] } } });
    for (const l of lines) {
      const data = {
        productId: l.productId, productName: l.productName, productImage: l.productImage,
        color: l.color, size: l.size, quantity: l.quantity, price: l.price, preorder: l.preorder,
      };
      if (l.id) await tx.orderItem.update({ where: { id: l.id }, data });
      else await tx.orderItem.create({ data: { ...data, orderId } });
    }

    const self = input.deliveryMode === "self";
    return tx.order.update({
      where: { id: orderId },
      data: {
        customerName: input.customer.name,
        customerEmail: input.customer.email,
        customerPhone: input.customer.phone,
        address: self ? input.customer.address || "איסוף עצמי" : input.customer.address,
        city: input.customer.city,
        floor: input.customer.floor,
        apartment: input.customer.apartment,
        deliveryMode: input.deliveryMode,
        pudoCodeDestination: input.deliveryMode === "epost" ? input.pudoCodeDestination : null,
        pudoPointName: input.deliveryMode === "epost" ? input.pudoPointName : null,
        delivery: input.delivery,
        subtotal,
        total,
      },
      include: { items: { include: { product: true } } },
    });
  });
}
