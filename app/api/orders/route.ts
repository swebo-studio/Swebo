import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { validateCoupon } from "@/lib/coupon";
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
  const { customer, cartItems, delivery: requestedDelivery, couponCode, pudoCodeDestination, pudoPointName, deliveryMode } = body;

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
      floor: customer.floor ?? null,
      apartment: customer.apartment ?? null,
      city: customer.city,
      subtotal,
      delivery,
      total,
      pudoCodeDestination: pudoCodeDestination != null ? String(pudoCodeDestination) : null,
      pudoPointName: pudoPointName ?? null,
      deliveryMode: deliveryMode ?? null,
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

  // Stock is decremented in /api/payment/notify only after payment is confirmed

  return Response.json(order, { status: 201 });
}
