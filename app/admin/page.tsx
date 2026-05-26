import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [orders, products] = await Promise.all([
    prisma.order.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.product.findMany(),
  ]);

  const paidOrders = orders.filter((o) => o.status === "paid");
  const revenue = paidOrders.reduce((s, o) => s + o.total, 0);
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const lowStock = products.filter((p) => p.stock <= 3 && p.active);

  const recentOrders = orders.slice(0, 8);

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

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-8" style={{ color: "var(--text)" }}>
        לוח בקרה
      </h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: "הכנסות (שולמו)", value: `₪${revenue.toLocaleString()}`, color: "var(--green)" },
          { label: "הזמנות שולמו", value: paidOrders.length, color: "var(--text)" },
          { label: "ממתינות לתשלום", value: pendingOrders, color: "#b08c00" },
          { label: "מוצרים פעילים", value: products.filter((p) => p.active).length, color: "var(--text)" },
        ].map((card) => (
          <div
            key={card.label}
            className="p-5 rounded-2xl border text-right"
            style={{ background: "var(--cream-dark)", borderColor: "var(--border)" }}
          >
            <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
              {card.label}
            </p>
            <p className="text-2xl font-extrabold" style={{ color: card.color }}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Low stock warning */}
      {lowStock.length > 0 && (
        <div
          className="mb-8 p-4 rounded-2xl border text-right"
          style={{ background: "#fff3e0", borderColor: "#f59e0b" }}
        >
          <p className="font-bold mb-2" style={{ color: "#92400e" }}>
            ⚠️ מלאי נמוך
          </p>
          {lowStock.map((p) => (
            <p key={p.id} className="text-sm" style={{ color: "#92400e" }}>
              {p.nameHe} — {p.stock} יחידות
            </p>
          ))}
        </div>
      )}

      {/* Recent orders */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ borderColor: "var(--border)" }}
      >
        <div
          className="px-6 py-4 border-b font-bold text-right"
          style={{ background: "var(--cream-dark)", borderColor: "var(--border)", color: "var(--text)" }}
        >
          הזמנות אחרונות
        </div>
        {recentOrders.length === 0 ? (
          <p className="p-6 text-center" style={{ color: "var(--text-muted)" }}>
            אין הזמנות עדיין
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead>
                <tr style={{ borderBottom: `1px solid var(--border)`, background: "var(--cream-dark)" }}>
                  {["#", "לקוח", "עיר", "סכום", "סטטוס", "תאריך"].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    style={{ borderBottom: `1px solid var(--border)` }}
                  >
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                      {order.id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--text)" }}>
                      {order.customerName}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>
                      {order.city}
                    </td>
                    <td className="px-4 py-3 font-bold" style={{ color: "var(--text)" }}>
                      ₪{order.total}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-1 rounded-full text-xs font-bold"
                        style={{
                          background: `${statusColor[order.status]}22`,
                          color: statusColor[order.status],
                        }}
                      >
                        {statusLabel[order.status] ?? order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                      {new Date(order.createdAt).toLocaleDateString("he-IL")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
