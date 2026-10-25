import { prisma } from "@/lib/db";
import { notifyOrderConfirmation, notifyAdmin, newOrderAdminMessage, checkSmsBalance, notifyCollabOrder } from "@/lib/notify";
import { shekels } from "@/lib/collab";
import { createHFDShipment } from "@/lib/hfd";

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
  for (const item of order.items) {
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
            oversoldItems.push(`${item.product.nameHe} (${item.color} / מידה ${item.size})`);
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
        oversoldItems.push(item.product.nameHe);
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
      items: order.items.map((it) => ({
        nameHe: it.product.nameHe,
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

  // 4. Create HFD shipment
  try {
    if (order.delivery > 0 || order.pudoCodeDestination || order.deliveryMode === "epost") {
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
      if (result && result.shipmentNumber) {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            shipmentNumber: String(result.shipmentNumber),
            shipmentRandId: result.randNumber,
          },
        });
      } else if (result) {
        console.error("[HFD] Shipment creation failed:", order.id, result.errorCode, result.errorMessage);
        await notifyAdmin("שגיאת HFD", `הזמנה #${order.id.slice(-6).toUpperCase()} — יצירת משלוח נכשלה (${result.errorCode}): ${result.errorMessage}`).catch(() => {});
      }
    }
  } catch (e) {
    console.error("[Post-payment] HFD shipment failed:", order.id, e);
    await notifyAdmin("שגיאת HFD", `הזמנה #${order.id.slice(-6).toUpperCase()} — יצירת משלוח נכשלה עם שגיאה`).catch(() => {});
  }

  // 5. Warn the admins if this order's texts took credits below the line
  await checkSmsBalance().catch((e) => console.error("[Post-payment] SMS balance check failed:", e));
}
