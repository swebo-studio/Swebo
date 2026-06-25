import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyHypayTransaction } from "@/lib/hypay";
import { notifyOrderConfirmation, notifyAdmin } from "@/lib/notify";
import { createHFDShipment } from "@/lib/hfd";

/**
 * HYPay redirects the customer's browser to this URL after payment.
 * All transaction params are appended as query string by HYPay.
 * We verify the transaction, update the order, then redirect the user.
 */
export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  // orderId comes from our dynamic SuccessUrl param; fall back to HYPay's Order field
  const orderId = params["orderId"] || params["Order"];
  const transactionId = params["Id"];
  const origin = req.nextUrl.origin;

  if (!orderId) {
    return Response.redirect(`${origin}/checkout?status=failed`);
  }

  // Verify with HYPay's APISign endpoint
  const verified = await verifyHypayTransaction(params);

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status:    verified ? "paid" : "failed",
      paymentId: transactionId ?? null,
    },
  });

  if (verified) {
    // Load the full order once, then fan out all post-payment actions
    prisma.order
      .findUnique({
        where: { id: orderId },
        include: { items: { include: { product: true } } },
      })
      .then(async (order) => {
        if (!order) return;

        // 1. Decrement stock
        for (const item of order.items) {
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

        // 2. Customer confirmation SMS
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

        // 3. Admin notification SMS
        const itemLines = order.items
          .map((i) => `• ${i.product.nameHe} × ${i.quantity} (${i.color ?? "ללא צבע"} / מידה ${i.size}) ₪${i.price * i.quantity}`)
          .join("\n");
        const deliveryLine =
          order.deliveryMode === "self" ? "איסוף עצמי" :
          order.deliveryMode === "epost" ? `נקודת איסוף: ${order.pudoPointName ?? ""} (${order.city})` :
          `משלוח לכתובת: ${order.address}${order.floor ? `, קומה ${order.floor}` : ""}${order.apartment ? `, דירה ${order.apartment}` : ""}, ${order.city}`;
        const msg = `הזמנה #${order.id.slice(-6).toUpperCase()}\nלקוח: ${order.customerName}\nטל: ${order.customerPhone}\nסה"כ: ₪${order.total}\n${deliveryLine}\n\n${itemLines}`;
        await notifyAdmin("הזמנה חדשה", msg);

        // 4. Create HFD shipment
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
        }
      })
      .catch((e) => console.error("[Post-payment actions] failed:", e));

    return Response.redirect(`${origin}/order/${orderId}?status=success`);
  } else {
    return Response.redirect(`${origin}/checkout?status=failed`);
  }
}
