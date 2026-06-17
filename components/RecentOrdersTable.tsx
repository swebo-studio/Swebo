"use client";
import { useState } from "react";

interface Order {
  id: string;
  customerName: string;
  city: string;
  total: number;
  status: string;
  createdAt: string;
}

const statusLabel: Record<string, string> = { paid: "שולם", pending: "ממתין", failed: "נכשל" };
const statusColor: Record<string, string> = { paid: "var(--green)", pending: "#b08c00", failed: "var(--maroon)" };

export default function RecentOrdersTable({ initial }: { initial: Order[] }) {
  const [orders, setOrders] = useState(initial);
  const [collapsed, setCollapsed] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("למחוק הזמנה זו לצמיתות?")) return;
    setDeleting(id);
    const res = await fetch(`/api/orders/${id}`, { method: "DELETE" });
    if (res.ok) setOrders((prev) => prev.filter((o) => o.id !== id));
    setDeleting(null);
  }

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
      {/* Header */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full px-6 py-4 border-b flex items-center justify-between transition-opacity hover:opacity-70"
        style={{ background: "var(--cream-dark)", borderColor: "var(--border)" }}
      >
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>{collapsed ? "הצג" : "הסתר"}</span>
        <span className="font-bold text-right" style={{ color: "var(--text)" }}>הזמנות אחרונות</span>
      </button>

      {!collapsed && (
        orders.length === 0 ? (
          <p className="p-6 text-center" style={{ color: "var(--text-muted)" }}>אין הזמנות עדיין</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead>
                <tr style={{ borderBottom: `1px solid var(--border)`, background: "var(--cream-dark)" }}>
                  {["#", "לקוח", "עיר", "סכום", "סטטוס", "תאריך", ""].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} style={{ borderBottom: `1px solid var(--border)` }}>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                      {order.id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--text)" }}>{order.customerName}</td>
                    <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>{order.city}</td>
                    <td className="px-4 py-3 font-bold" style={{ color: "var(--text)" }}>₪{order.total}</td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-1 rounded-full text-xs font-bold"
                        style={{
                          background: `${statusColor[order.status] ?? "#888"}22`,
                          color: statusColor[order.status] ?? "#888",
                        }}
                      >
                        {statusLabel[order.status] ?? order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                      {new Date(order.createdAt).toLocaleDateString("he-IL")}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(order.id)}
                        disabled={deleting === order.id}
                        className="text-xs px-2 py-1 rounded-lg border transition-opacity hover:opacity-70 disabled:opacity-30"
                        style={{ borderColor: "#f5e8e8", color: "var(--maroon)" }}
                      >
                        {deleting === order.id ? "..." : "מחק"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
