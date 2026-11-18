import { prisma } from "@/lib/db";
import { notifyOrderConfirmation, notifyPreorderReleased, notifyAdmin, newOrderAdminMessage, checkSmsBalance, notifyCollabOrder } from "@/lib/notify";
import { shekels } from "@/lib/collab";
import { createHFDShipment } from "@/lib/hfd";
import { PREORDER_STAGE } from "@/lib/preorder";
import { orderItemName } from "@/lib/orderItem";

/**
 * Flips an order to "paid" only if it is not paid already, and reports
 * whether this call did it. Whoever wins runs fulfillPaidOrder — so a
 * reloaded success URL, or an admin confirming an order the payment
 * redirect already confirmed, cannot ship or text it twice.
 */
export async function claimPaid(orderId: string, paymentId?: string | null): Promise<boolean> {
  const claimed = await prisma.order.updateMany({
    where: { id: orderId, status: { not: "paid" } },
    data: { status: "paid", ...(paymentId ? { paymentId } : {}) },
  });
  return claimed.count > 0;
}

/** Post-payment side effects: stock, coupon, SMS (customer, admin, creator), HFD shipment. */
export async function fulfillPaidOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } } },
  });
  if (!order) return;

  // Each step is independent — one failing (e.g. ActiveTrail down) must
  // never prevent the others (e.g. HFD shipment) from running.

  // 1. Decrement stock.
  //    The stock check is embedded directly in the UPDATE WHERE clause
  //    (stock >= quantity). PostgreSQL acquires a row-level lock on UPDATE,
  //    so a concurrent payment hitting the same row will block, then
  //    re-evaluate the WHERE with the committed value — and get 0 rows
  //    updated if stock was already taken. This is the only truly atomic
  //    pattern at Read Committed isolation; a separate SELECT then UPDATE
  //    inside a transaction does NOT prevent concurrent oversell.
  const oversoldItems: string[] = [];
  for (const line of order.items) {
    // A product deleted between checkout and payment has no stock to take
    if (!line.productId) continue;
    const item = { ...line, productId: line.productId };
    try {
      if (item.color) {
        const colorRow = await prisma.productColor.findFirst({ where: { productId: item.productId, nameHe: item.color } });
        if (colorRow) {
          // Atomic: only decrements if stock >= quantity right now
          const sizeResult = await prisma.productColorSize.updateMany({
            where: { colorId: colorRow.id, size: item.size, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (sizeResult.count === 0) {
            // Another concurrent payment took the last stock — clamp to 0
            await prisma.productColorSize.updateMany({
              where: { colorId: colorRow.id, size: item.size, stock: { gt: 0 } },
              data: { stock: 0 },
            });
            oversoldItems.push(`${orderItemName(item)} (${item.color} / מידה ${item.size})`);
          }
          // Mirror on color-level aggregate (informational, not source of truth)
          await prisma.productColor.update({ where: { id: colorRow.id }, data: { stock: { decrement: item.quantity } } });
          continue;
        }
      }
      // No color: product-level stock
      const result = await prisma.product.updateMany({
        where: { id: item.productId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (result.count === 0) {
        await prisma.product.updateMany({
          where: { id: item.productId, stock: { gt: 0 } },
          data: { stock: 0 },
        });
        oversoldItems.push(orderItemName(item));
      }
    } catch (e) {
      console.error("[Post-payment] stock decrement failed for item:", item.productId, e);
    }
  }
  if (oversoldItems.length > 0) {
    console.error("[Post-payment] OVERSELL detected on order", order.id, oversoldItems);
    await notifyAdmin(
      "אזהרת מלאי",
      `הזמנה #${order.id.slice(-6).toUpperCase()} — נמכר מלאי ביתר:\n${oversoldItems.map((n) => `• ${n}`).join("\n")}\nיש לבדוק מלאי ולצור קשר עם הלקוח.`
    ).catch(() => {});
  }

  // Mark the coupon as used now that payment is confirmed (not at order
  // creation — an abandoned checkout must not burn the customer's code).
  try {
    if (order.couponCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: order.couponCode } });
      if (coupon && coupon.singleUse && !coupon.usedAt) {
        await prisma.coupon.update({ where: { id: coupon.id }, data: { usedAt: new Date(), usedByEmail: order.customerEmail } });
        await prisma.newsletter.updateMany({ where: { couponCode: order.couponCode }, data: { usedAt: new Date() } });
      }
    }
  } catch (e) {
    console.error("[Post-payment] coupon mark-used failed:", order.id, e);
  }

  // 2. Customer confirmation SMS
  try {
    await notifyOrderConfirmation({
      id: order.id,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      total: order.total,
      preorder: order.orderStage === PREORDER_STAGE,
      items: order.items.map((it) => ({
        nameHe: orderItemName(it),
        quantity: it.quantity,
        size: it.size,
        color: it.color,
        price: it.price,
      })),
    });
  } catch (e) {
    console.error("[Post-payment] customer SMS failed:", order.id, e);
  }

  // 3. Admin notification SMS
  try {
    await notifyAdmin("הזמנה חדשה", newOrderAdminMessage(order));
  } catch (e) {
    console.error("[Post-payment] admin SMS failed:", order.id, e);
  }

  // 3b. Creator SMS, when the order came through a creator's code
  try {
    if (order.collabCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: order.collabCode } });
      if (coupon?.collabPhone) {
        await notifyCollabOrder(coupon.collabPhone, {
          code: order.collabCode,
          customerName: order.customerName,
          amount: shekels(order.subtotal),
          commission: shekels(order.collabCommission ?? 0),
        });
      }
    }
  } catch (e) {
    console.error("[Post-payment] creator SMS failed:", order.id, e);
  }

  // 4. Create HFD shipment — a preorder's waits until an admin releases it
  //    (releasePreorder below)
  if (order.orderStage !== PREORDER_STAGE) {
    await sendOrderToHFD(order.id, { auto: true });
  }

  // 5. Warn the admins if this order's texts took credits below the line
  await checkSmsBalance().catch((e) => console.error("[Post-payment] SMS balance check failed:", e));
}

/** Orders HFD delivers: home and pickup point, not self-pickup. */
function needsHFD(order: { deliveryMode: string | null; delivery: number; pudoCodeDestination: string | null }): boolean {
  if (order.deliveryMode) return order.deliveryMode !== "self";
  // Legacy orders saved no delivery mode — the fee told them apart
  return order.delivery > 0 || !!order.pudoCodeDestination;
}

/** How long an unfinished HFD claim blocks another attempt. */
const STALE_CLAIM_MS = 5 * 60_000;
/** Far-future claim for an order HFD shipped but whose number failed to save:
 *  never stale, so nothing opens a second shipment for it automatically. */
const STUCK_CLAIM = new Date("9999-01-01T00:00:00Z");

/**
 * The payment's own automatic shipment, as it always worked: a fee was paid,
 * or the order goes to a pickup point / e-post. A home order with free
 * delivery is left for the admin to send by hand.
 */
function shipsAutomatically(order: { deliveryMode: string | null; delivery: number; pudoCodeDestination: string | null }): boolean {
  return order.delivery > 0 || !!order.pudoCodeDestination || order.deliveryMode === "epost";
}

export type HFDSendResult =
  | { ok: true; shipmentNumber: string }
  | { ok: false; reason: "not-found" | "not-paid" | "preorder" | "no-delivery" | "already-sent" | "not-configured" | "failed"; message?: string };

/**
 * Creates the order's HFD shipment, once. The claim on hfdSentAt makes the
 * payment redirect, a preorder release and the admin's button safe to race;
 * a refused shipment releases it so the admin can try again. A preorder is
 * never shipped here unless the call is its release.
 */
export async function sendOrderToHFD(orderId: string, opts: { quiet?: boolean; release?: boolean; auto?: boolean } = {}): Promise<HFDSendResult> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, reason: "not-found" };
  if (order.status !== "paid") return { ok: false, reason: "not-paid" };
  if (order.orderStage === PREORDER_STAGE && !opts.release) return { ok: false, reason: "preorder" };
  if (!needsHFD(order)) return { ok: false, reason: "no-delivery" };
  if (opts.auto && !shipsAutomatically(order)) return { ok: false, reason: "no-delivery" };

  const { count } = await prisma.order.updateMany({
    where: {
      id: orderId, status: "paid", shipmentNumber: null,
      // A claim older than this belongs to an attempt that died midway
      // (timeout, deploy) without releasing it; the HFD call itself gives up
      // long before, so it is safe to take over.
      OR: [{ hfdSentAt: null }, { hfdSentAt: { lt: new Date(Date.now() - STALE_CLAIM_MS) } }],
      // Re-checked in the claim itself: an order still waiting as a preorder
      // can only be shipped by its release
      ...(opts.release ? {} : { orderStage: { not: PREORDER_STAGE } }),
    },
    data: { hfdSentAt: new Date() },
  });
  if (count === 0) return { ok: false, reason: "already-sent" };

  const ref = order.id.slice(-6).toUpperCase();
  const release = () => prisma.order.update({ where: { id: orderId }, data: { hfdSentAt: null } }).catch(() => {});
  const fail = async (message: string): Promise<HFDSendResult> => {
    await release();
    if (!opts.quiet) await notifyAdmin("שגיאת HFD", `הזמנה #${ref} — יצירת משלוח נכשלה ${message}`).catch(() => {});
    return { ok: false, reason: "failed", message };
  };

  let shipmentNumber: string;
  let randId: string;
  try {
    const result = await createHFDShipment({
      id: order.id,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      address: order.address,
      floor: order.floor,
      apartment: order.apartment,
      city: order.city,
      total: order.total,
      pudoCodeDestination: order.pudoCodeDestination ? Number(order.pudoCodeDestination) : undefined,
      isEpost: order.deliveryMode === "epost",
    });
    if (!result) {
      // createHFDShipment returns null both when HFD is not set up and on a
      // network / HTTP error; only the latter is worth an alert.
      if (!process.env.HFD_CLIENT_NUMBER) {
        await release();
        return { ok: false, reason: "not-configured" };
      }
      return fail("(אין תשובה מ-HFD)");
    }
    if (!result.shipmentNumber) {
      console.error("[HFD] Shipment creation failed:", order.id, result.errorCode, result.errorMessage);
      return fail(`(${result.errorCode}): ${result.errorMessage}`);
    }
    shipmentNumber = String(result.shipmentNumber);
    randId = result.randNumber;
  } catch (e) {
    console.error("[HFD] shipment failed:", order.id, e);
    return fail("עם שגיאה");
  }

  // HFD has the shipment now. Saving it must not release the claim on
  // failure, or the next attempt would open a second shipment.
  for (let attempt = 0; ; attempt++) {
    try {
      await prisma.order.update({ where: { id: order.id }, data: { shipmentNumber, shipmentRandId: randId } });
      return { ok: true, shipmentNumber };
    } catch (e) {
      if (attempt < 2) { await new Promise((r) => setTimeout(r, 500 * (attempt + 1))); continue; }
      console.error("[HFD] shipment opened but not saved:", order.id, shipmentNumber, e);
      await prisma.order.update({ where: { id: order.id }, data: { hfdSentAt: STUCK_CLAIM } }).catch(() => {});
      await notifyAdmin("שגיאת HFD", `הזמנה #${ref} — נפתח משלוח ${shipmentNumber} ב-HFD אבל לא נשמר בהזמנה. אין לפתוח משלוח נוסף; יש לעדכן ידנית.`).catch(() => {});
      return { ok: false, reason: "failed", message: `(משלוח ${shipmentNumber} נפתח ב-HFD אך לא נשמר)` };
    }
  }
}

export type ReleaseResult =
  | { ok: true; shipmentNumber: string | null }
  | { ok: false; error: string };

const RELEASE_ERRORS: Record<string, string> = {
  "not-found": "ההזמנה לא נמצאה",
  "not-paid": "ההזמנה עוד לא שולמה",
  "already-sent": "המשלוח של ההזמנה כבר בתהליך פתיחה — רעננו את הדף",
  "not-configured": "HFD לא מוגדר — לא נפתח משלוח",
  failed: "פתיחת המשלוח ב-HFD נכשלה",
};

/**
 * Releases a paid preorder: opens its HFD shipment (self-pickup has none),
 * moves it to "received" and texts the buyer. If HFD fails the order stays a
 * preorder and nothing is sent, so the admin can try again. Safe to call
 * twice at once: the HFD claim lets one shipment through, and the stage
 * change lets one text through.
 */
export async function releasePreorder(orderId: string): Promise<ReleaseResult> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, error: RELEASE_ERRORS["not-found"] };
  if (order.status !== "paid") return { ok: false, error: RELEASE_ERRORS["not-paid"] };
  if (order.orderStage !== PREORDER_STAGE) return { ok: false, error: "ההזמנה כבר שוחררה" };

  // A shipment opened by an earlier attempt that failed afterwards is kept
  let shipmentNumber = order.shipmentNumber;
  if (!shipmentNumber && needsHFD(order)) {
    const sent = await sendOrderToHFD(orderId, { quiet: true, release: true });
    if (!sent.ok) {
      const error = RELEASE_ERRORS[sent.reason] ?? "פתיחת המשלוח ב-HFD נכשלה";
      return { ok: false, error: sent.message ? `${error} ${sent.message}` : error };
    }
    shipmentNumber = sent.shipmentNumber;
  }

  const { count } = await prisma.order.updateMany({
    where: { id: orderId, orderStage: PREORDER_STAGE },
    data: { orderStage: "received" },
  });
  if (count === 0) return { ok: false, error: "ההזמנה כבר שוחררה" };

  try {
    await notifyPreorderReleased({ ...order, shipmentNumber });
  } catch (e) {
    console.error("[Preorder release] customer SMS failed:", orderId, e);
  }
  return { ok: true, shipmentNumber };
}
