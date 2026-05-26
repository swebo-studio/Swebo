import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

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
  const { customer, cartItems, delivery: requestedDelivery } = body;

  const subtotal = cartItems.reduce(
    (sum: number, item: { price: number; quantity: number }) =>
      sum + item.price * item.quantity,
    0
  );
  const delivery = requestedDelivery === 0 ? 0 : 40;
  const total = subtotal + delivery;

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
        create: cartItems.map(
          (item: {
            productId: string;
            quantity: number;
            size: string;
            color?: string;
            price: number;
          }) => ({
            productId: item.productId,
            quantity: item.quantity,
            size: item.size,
            color: item.color ?? null,
            price: item.price,
          })
        ),
      },
    },
    include: { items: true },
  });

  // Decrease stock — per-color if color specified, otherwise product-level
  for (const item of cartItems) {
    if (item.color) {
      const colorRow = await prisma.productColor.findFirst({
        where: { productId: item.productId, nameHe: item.color },
      });
      if (colorRow) {
        await prisma.productColor.update({
          where: { id: colorRow.id },
          data: { stock: { decrement: item.quantity } },
        });
        continue;
      }
    }
    await prisma.product.update({
      where: { id: item.productId },
      data: { stock: { decrement: item.quantity } },
    });
  }

  return Response.json(order, { status: 201 });
}
