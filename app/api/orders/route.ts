import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notifyAdmin, notifyCustomerEmail } from "@/lib/notify";
import { validateCoupon } from "@/lib/coupon";
import { createHFDShipment } from "@/lib/hfd";

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
  const { customer, cartItems, delivery: requestedDelivery, couponCode } = body;

  // Validate coupon
  let discountPct = 0;
  let couponId: string | null = null;
  if (couponCode) {
    const coupon = await validateCoupon(couponCode);
    if (coupon) { discountPct = coupon.discountPct; couponId = coupon.singleUse ? coupon.id : null; }
  }

  const subtotal = cartItems.reduce(
    (sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity, 0
  );
  const discount = Math.round(subtotal * discountPct / 100);
  const delivery = requestedDelivery === 0 ? 0 : 40;
  const total = subtotal - discount + delivery;

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
        create: cartItems.map((item: { productId: string; quantity: number; size: string; color?: string; price: number }) => ({
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
  }

  // Decrement stock
  for (const item of cartItems) {
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

  // Create HFD shipment (only for home delivery, fire and forget)
  if (delivery > 0) {
    createHFDShipment({
      id: order.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email,
      address: customer.address,
      city: customer.city,
      total,
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

  if (customer.email) {
    notifyCustomerEmail(
      customer.email,
      `SWEBO – אישור הזמנה #${order.id.slice(-6).toUpperCase()}`,
      `<div dir="rtl" style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>תודה על הזמנתך!</h2>
        <p>מספר הזמנה: <strong>${order.id.slice(-6).toUpperCase()}</strong></p>
        <pre style="background:#F5F0E8;padding:12px;border-radius:8px;white-space:pre-wrap">${msg}</pre>
      </div>`
    ).catch(() => {});
  }

  return Response.json(order, { status: 201 });
}
