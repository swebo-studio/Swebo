import { NextRequest, after } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { validateCoupon } from "@/lib/coupon";
import { scopeCoversDelivery, type DeliveryMode } from "@/lib/shippingScope";
import { evaluatePromotions } from "@/lib/promotions";
import { promotionPricing } from "@/lib/cartPricing";
import { alertStalePendingOrders } from "@/lib/pendingOrders";

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

  // Validate stock before accepting the order
  {
    const typedItems = cartItems as { productId: string; quantity: number; size: string; color?: string }[];
    const productIds = [...new Set(typedItems.map((i) => i.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { colors: { include: { sizes: true } } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of typedItems) {
      const product = productMap.get(item.productId);
      if (!product) return Response.json({ error: "מוצר לא נמצא" }, { status: 400 });

      let available = 0;
      if (item.color) {
        const colorRow = product.colors.find((c) => c.nameHe === item.color);
        if (colorRow) {
          // A colour that tracks stock per size only sells the sizes it lists.
          // Falling back to the colour total here would let a stale cart item —
          // a size since renamed or removed — pass the stock check.
          available = colorRow.sizes.length > 0
            ? colorRow.sizes.find((s) => s.size === item.size)?.stock ?? 0
            : colorRow.stock;
        }
      } else {
        available = product.stock;
      }

      if (available < item.quantity) {
        return Response.json(
          { error: `המוצר "${product.nameHe}" לא זמין בכמות המבוקשת (נותרו ${available} במלאי)`, outOfStock: true },
          { status: 400 }
        );
      }
    }
  }

  // Validate coupon (marked as used only once payment is confirmed — see /api/payment/notify)
  let discountPct = 0;
  let discountAmount = 0;
  let freeShippingScope: string | null = null;
  let appliedCouponCode: string | null = null;
  if (couponCode) {
    const coupon = await validateCoupon(couponCode);
    if (coupon) {
      discountPct = coupon.discountPct ?? 0;
      discountAmount = coupon.discountAmount ?? 0;
      freeShippingScope = coupon.freeShipping;
      appliedCouponCode = couponCode.toUpperCase();
    }
  }

  const rawSubtotal = cartItems.reduce(
    (sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity, 0
  );

  // Evaluate promotions server-side
  const rewards = await evaluatePromotions(cartItems, rawSubtotal);
  const baseDelivery = requestedDelivery === 0 ? 0 : requestedDelivery === 25 ? 25 : 40;
  const mode: DeliveryMode = baseDelivery === 40 ? "home" : baseDelivery === 25 ? "epost" : "self";
  const pricing = promotionPricing(cartItems, rewards);
  const promoSubtotal = pricing.subtotal;
  // Only the delivery a free-shipping promotion covers — the same rule the checkout shows
  const promoDelivery = scopeCoversDelivery(pricing.freeShippingScope, mode) ? 0 : baseDelivery;

  // Same rule the checkout enforces: a cart whose price is already cut by a
  // promotion cannot also redeem a coupon.
  if (promoSubtotal < rawSubtotal) {
    discountPct = 0;
    discountAmount = 0;
    freeShippingScope = null;
    appliedCouponCode = null;
  }

  // A free-shipping coupon zeroes the delivery it covers. When it covers
  // nothing here (self-pickup, or a home-only coupon on a pickup point, or
  // delivery a promotion already made free) it is not recorded, so a
  // single-use code is not spent on an order it did not help.
  let delivery = promoDelivery;
  if (freeShippingScope) {
    if (scopeCoversDelivery(freeShippingScope, mode) && promoDelivery > 0) delivery = 0;
    else appliedCouponCode = null;
  }

  // Apply coupon on top of promotion-adjusted subtotal
  const couponSavings = discountAmount > 0
    ? Math.min(discountAmount, promoSubtotal)
    : Math.round(promoSubtotal * discountPct / 100);
  const subtotal = promoSubtotal - couponSavings;
  const total = subtotal + delivery;

  // Merge effective prices into cartItems. A discount capped below the line's
  // quantity ("50% off one shirt" with three in the cart) splits the line, so
  // every stored unit price is the price actually charged for that unit. The
  // engine already grouped each line's units by the price they pay, so the
  // stored lines are just those buckets.
  type CartLine = { productId: string; price: number; quantity: number; size: string; color?: string };
  const effectiveItems = (cartItems as CartLine[]).flatMap((item, i) => {
    const line = pricing.lines[i];
    if (!line || line.buckets.length === 0) return [item];
    return line.buckets.map((bucket) => ({ ...item, quantity: bucket.quantity, price: bucket.unitPrice }));
  });

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
      couponCode: appliedCouponCode,
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

  // Coupon is marked as used, and stock decremented, only in /api/payment/notify
  // once payment is actually confirmed — not here at order creation.

  // Every checkout also looks for earlier orders still stuck unpaid
  after(() => alertStalePendingOrders().catch((e) => console.error("[Pending alert] failed:", e)));

  return Response.json(order, { status: 201 });
}
