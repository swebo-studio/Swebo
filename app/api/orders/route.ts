import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { validateCoupon } from "@/lib/coupon";
import { evaluatePromotions } from "@/lib/promotions";
import { promotionPricing } from "@/lib/cartPricing";

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
          const sizeRow = colorRow.sizes.find((s) => s.size === item.size);
          available = sizeRow ? sizeRow.stock : colorRow.stock;
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
  let appliedCouponCode: string | null = null;
  if (couponCode) {
    const coupon = await validateCoupon(couponCode);
    if (coupon) {
      discountPct = coupon.discountPct ?? 0;
      discountAmount = coupon.discountAmount ?? 0;
      appliedCouponCode = couponCode.toUpperCase();
    }
  }

  const rawSubtotal = cartItems.reduce(
    (sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity, 0
  );

  // Evaluate promotions server-side
  const rewards = await evaluatePromotions(cartItems, rawSubtotal);
  const baseDelivery = requestedDelivery === 0 ? 0 : requestedDelivery === 25 ? 25 : 40;
  const pricing = promotionPricing(cartItems, rewards);
  const promoSubtotal = pricing.subtotal;
  const promoDelivery = pricing.freeShipping ? 0 : baseDelivery;

  // Same rule the checkout enforces: a cart whose price is already cut by a
  // promotion cannot also redeem a coupon.
  if (promoSubtotal < rawSubtotal) {
    discountPct = 0;
    discountAmount = 0;
    appliedCouponCode = null;
  }

  // Apply coupon on top of promotion-adjusted subtotal
  const couponSavings = discountAmount > 0
    ? Math.min(discountAmount, promoSubtotal)
    : Math.round(promoSubtotal * discountPct / 100);
  const subtotal = promoSubtotal - couponSavings;
  const delivery = promoDelivery;
  const total = subtotal + delivery;

  // Merge effective prices into cartItems. A discount capped below the line's
  // quantity ("50% off one shirt" with three in the cart) becomes two lines, so
  // every stored unit price is the price actually charged for that unit.
  type CartLine = { productId: string; price: number; quantity: number; size: string; color?: string };
  const effectiveItems = (cartItems as CartLine[]).flatMap((item, i) => {
    const line = pricing.lines[i];
    if (!line || line.discountedUnits === 0) return [item];
    const discounted = { ...item, quantity: line.discountedUnits, price: line.discountedUnitPrice };
    if (line.discountedUnits >= item.quantity) return [discounted];
    return [discounted, { ...item, quantity: item.quantity - line.discountedUnits }];
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

  return Response.json(order, { status: 201 });
}
