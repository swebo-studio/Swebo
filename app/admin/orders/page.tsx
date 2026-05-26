import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  paid: "שולם",
  pending: "ממתין",
  failed: "נכשל",
};
const statusColor: Record<string, string> = {
  paid: "var(--green)",
  pending: "#b08c00",
  failed: "var(--maroon)",
};

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-8" style={{ color: "var(--text)" }}>
        הזמנות
      </h1>

      {orders.length === 0 ? (
        <p className="text-center py-20" style={{ color: "var(--text-muted)" }}>
          אין הזמנות עדיין
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-2xl border p-5"
              style={{ background: "var(--cream-dark)", borderColor: "var(--border)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{
                    background: `${statusColor[order.status] ?? "#888"}22`,
                    color: statusColor[order.status] ?? "#888",
                  }}
                >
                  {statusLabel[order.status] ?? order.status}
                </span>
                <div className="text-right">
                  <p className="font-bold" style={{ color: "var(--text)" }}>
                    {order.customerName}
                  </p>
                  <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                    #{order.id.slice(-8).toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="text-sm text-right mb-3" style={{ color: "var(--text-muted)" }}>
                <p>{order.address}, {order.city}</p>
                <p>{order.customerPhone} · {order.customerEmail}</p>
                <p>{new Date(order.createdAt).toLocaleString("he-IL")}</p>
              </div>

              <div className="border-t pt-3" style={{ borderColor: "var(--border)" }}>
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm mb-1">
                    <span style={{ color: "var(--text-muted)" }}>₪{item.price * item.quantity}</span>
                    <span style={{ color: "var(--text)" }}>
                      {item.product.nameHe} × {item.quantity} (מידה {item.size})
                    </span>
                  </div>
                ))}
                <div
                  className="flex justify-between font-extrabold mt-2 pt-2 border-t"
                  style={{ borderColor: "var(--border)", color: "var(--text)" }}
                >
                  <span>₪{order.total}</span>
                  <span>סה&quot;כ</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
