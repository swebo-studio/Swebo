import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notifyAdmin } from "@/lib/notify";
import { validateCoupon } from "@/lib/coupon";
import { createHFDShipment } from "@/lib/hfd";
import { evaluatePromotions, applyRewards } from "@/lib/promotions";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const orders = await prisma.order.findMany({
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });
  return Response.json(orders);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { customer, cartItems, delivery: requestedDelivery, couponCode, pudoCodeDestination } = body;

  // Validate coupon
  let discountPct = 0;
  let discountAmount = 0;
  let couponId: string | null = null;
  if (couponCode) {
    const coupon = await validateCoupon(couponCode);
    if (coupon) {
      discountPct = coupon.discountPct ?? 0;
      discountAmount = coupon.discountAmount ?? 0;
      couponId = coupon.singleUse ? coupon.id : null;
    }
  }

  const rawSubtotal = cartItems.reduce(
    (sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity, 0
  );

  // Evaluate promotions server-side
  const rewards = await evaluatePromotions(cartItems, rawSubtotal);
  const baseDelivery = requestedDelivery === 0 ? 0 : requestedDelivery === 25 ? 25 : 40;
  const { subtotal: promoSubtotal, delivery: promoDelivery, itemPrices } = applyRewards(cartItems, rawSubtotal, baseDelivery, rewards);

  // Apply coupon on top of promotion-adjusted subtotal
  const couponSavings = discountAmount > 0
    ? Math.min(discountAmount, promoSubtotal)
    : Math.round(promoSubtotal * discountPct / 100);
  const subtotal = promoSubtotal - couponSavings;
  const delivery = promoDelivery;
  const total = subtotal + delivery;

  // Merge effective prices into cartItems
  const effectiveItems = cartItems.map((item: { productId: string; price: number; quantity: number; size: string; color?: string }) => ({
    ...item,
    price: itemPrices[item.productId] ?? item.price,
  }));

  const order = await prisma.order.create({
    data: {
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      address: customer.address,
      city: customer.city,
      subtotal,
      delivery,
      total,
      items: {
        create: effectiveItems.map((item: { productId: string; quantity: number; size: string; color?: string; price: number }) => ({
          productId: item.productId,
          quantity: item.quantity,
          size: item.size,
          color: item.color ?? null,
          price: item.price,
        })),
      },
    },
    include: { items: { include: { product: true } } },
  });

  // Mark coupon used
  if (couponId) {
    await prisma.coupon.update({ where: { id: couponId }, data: { usedAt: new Date(), usedByEmail: customer.email } });
    // Also mark the newsletter signup (if any) so the 24h reminder cron skips it
    await prisma.newsletter.updateMany({ where: { couponCode: couponCode.toUpperCase() }, data: { usedAt: new Date() } });
  }

  // Decrement stock
  for (const item of effectiveItems) {
    if (item.color) {
      const colorRow = await prisma.productColor.findFirst({ where: { productId: item.productId, nameHe: item.color } });
      if (colorRow) {
        const sizeRow = await prisma.productColorSize.findUnique({ where: { colorId_size: { colorId: colorRow.id, size: item.size } } });
        if (sizeRow) {
          await prisma.productColorSize.update({ where: { colorId_size: { colorId: colorRow.id, size: item.size } }, data: { stock: { decrement: item.quantity } } });
        }
        await prisma.productColor.update({ where: { id: colorRow.id }, data: { stock: { decrement: item.quantity } } });
        continue;
      }
    }
    await prisma.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } });
  }

  // Create HFD shipment — for home delivery and EPOST pickup points
  if (delivery > 0 || pudoCodeDestination) {
    createHFDShipment({
      id: order.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email,
      address: customer.address,
      city: customer.city,
      total,
      pudoCodeDestination: pudoCodeDestination ?? undefined,
    }).then(async (result) => {
      if (result && result.errorCode === "0" && result.shipmentNumber) {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            shipmentNumber: String(result.shipmentNumber),
            shipmentRandId: result.randNumber,
          },
        });
      } else if (result) {
        console.error("[HFD] Shipment creation failed:", result.errorCode, result.errorMessage);
      }
    }).catch((err) => console.error("[HFD] Error:", err));
  }

  // Notifications — fire and forget
  const itemLines = order.items.map((i) =>
    `• ${i.product.nameHe} × ${i.quantity} (${i.color ?? "ללא צבע"} / מידה ${i.size}) ₪${i.price * i.quantity}`
  ).join("\n");
  const msg = `הזמנה #${order.id.slice(-6).toUpperCase()}\nלקוח: ${customer.name}\nטל: ${customer.phone}\nסה"כ: ₪${total}\n\n${itemLines}`;

  notifyAdmin("הזמנה חדשה", msg).catch(() => {});

  return Response.json(order, { status: 201 });
}
