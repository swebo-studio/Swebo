"use client";
import { useState, useEffect } from "react";

const HFD_BASE = "https://api.hfd.co.il/rest/v2";
function labelUrl(shipmentNumber: string) { return `${HFD_BASE}/shipments/${shipmentNumber}/label`; }

interface OrderItem {
  id: string;
  quantity: number;
  size: string;
  color: string | null;
  price: number;
  product: { nameHe: string };
}

interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  city: string;
  subtotal: number;
  delivery: number;
  total: number;
  status: string;
  shipmentNumber: string | null;
  shipmentRandId: string | null;
  createdAt: string;
  items: OrderItem[];
}

const STATUS_LABELS: Record<string, string> = {
  paid: "שולם",
  pending: "ממתין",
  failed: "נכשל",
  cancelled: "בוטל",
};
const STATUS_COLORS: Record<string, string> = {
  paid: "var(--green)",
  pending: "#b08c00",
  failed: "var(--maroon)",
  cancelled: "#888",
};

interface TrackingStatus {
  status_code: string;
  status_desc: string;
  status_date: string;
  status_time: string;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tracking, setTracking] = useState<Record<string, TrackingStatus[] | "loading" | "error">>({});
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((data) => { setOrders(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function loadTracking(orderId: string, shipmentNumber: string) {
    setTracking((t) => ({ ...t, [orderId]: "loading" }));
    const res = await fetch(`/api/orders/${orderId}/tracking`);
    if (!res.ok) { setTracking((t) => ({ ...t, [orderId]: "error" })); return; }
    const data = await res.json();
    setTracking((t) => ({ ...t, [orderId]: data.status ?? [] }));
  }

  async function handleCancel(orderId: string) {
    if (!confirm("לבטל את המשלוח ב-HFD? ניתן רק לפני שהשליח הגיע לאסוף.")) return;
    setCancelling(orderId);
    const res = await fetch(`/api/orders/${orderId}/cancel`, { method: "POST" });
    const data = await res.json();
    setCancelling(null);
    if (data.status === "OK") {
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: "cancelled" } : o));
      alert("המשלוח בוטל בהצלחה");
    } else {
      alert(`שגיאה: ${data.status_desc || data.error || "לא ניתן לבטל"}`);
    }
  }

  if (loading) return <p className="text-center py-20" style={{ color: "var(--text-muted)" }}>טוען...</p>;

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-8" style={{ color: "var(--text)" }}>הזמנות</h1>

      {orders.length === 0 ? (
        <p className="text-center py-20" style={{ color: "var(--text-muted)" }}>אין הזמנות עדיין</p>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => {
            const isExpanded = expandedId === order.id;
            const statusColor = STATUS_COLORS[order.status] ?? "#888";
            const trackResult = tracking[order.id];

            return (
              <div
                key={order.id}
                className="rounded-2xl border overflow-hidden"
                style={{ background: "var(--cream-dark)", borderColor: "var(--border)" }}
              >
                {/* Header row */}
                <div
                  className="flex items-center justify-between p-5 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-bold"
                      style={{ background: `${statusColor}22`, color: statusColor }}
                    >
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                    <span className="text-sm font-mono" style={{ color: "var(--text-muted)" }}>
                      #{order.id.slice(-8).toUpperCase()}
                    </span>
                    {order.shipmentNumber && (
                      <span className="text-xs px-2 py-0.5 rounded-lg font-mono" style={{ background: "#e8f5e9", color: "var(--green)" }}>
                        {order.shipmentNumber}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm" style={{ color: "var(--text)" }}>{order.customerName}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      ₪{order.total} · {new Date(order.createdAt).toLocaleDateString("he-IL")}
                    </p>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t px-5 pb-5" style={{ borderColor: "var(--border)" }}>
                    {/* Customer details */}
                    <div className="py-4 text-sm text-right" style={{ color: "var(--text-muted)" }}>
                      <p>{order.address}, {order.city}</p>
                      <p>{order.customerPhone} · {order.customerEmail}</p>
                      <p>{new Date(order.createdAt).toLocaleString("he-IL")}</p>
                    </div>

                    {/* Items */}
                    <div className="border-t pt-3 mb-4" style={{ borderColor: "var(--border)" }}>
                      {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm mb-1">
                          <span style={{ color: "var(--text-muted)" }}>₪{item.price * item.quantity}</span>
                          <span style={{ color: "var(--text)" }}>
                            {item.product.nameHe} × {item.quantity}
                            {item.color ? ` · ${item.color}` : ""} / מידה {item.size}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between font-extrabold mt-2 pt-2 border-t text-sm" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
                        <span>₪{order.total}</span>
                        <span>סה&quot;כ</span>
                      </div>
                    </div>

                    {/* HFD actions */}
                    {order.shipmentNumber ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap gap-2 justify-end">
                          {/* Label */}
                          <a
                            href={labelUrl(order.shipmentNumber)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-opacity hover:opacity-70"
                            style={{ borderColor: "var(--border)", color: "var(--text)" }}
                          >
                            הדפס תווית
                          </a>

                          {/* Tracking */}
                          <button
                            onClick={() => loadTracking(order.id, order.shipmentNumber!)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-opacity hover:opacity-70"
                            style={{ borderColor: "var(--border)", color: "var(--text)" }}
                          >
                            מעקב משלוח
                          </button>

                          {/* Cancel — only if not delivered/cancelled */}
                          {order.status !== "cancelled" && order.shipmentRandId && (
                            <button
                              onClick={() => handleCancel(order.id)}
                              disabled={cancelling === order.id}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-opacity hover:opacity-70 disabled:opacity-40"
                              style={{ borderColor: "#f5e8e8", color: "var(--maroon)" }}
                            >
                              {cancelling === order.id ? "מבטל..." : "בטל משלוח"}
                            </button>
                          )}
                        </div>

                        {/* Tracking results */}
                        {trackResult === "loading" && (
                          <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>טוען מעקב...</p>
                        )}
                        {trackResult === "error" && (
                          <p className="text-sm text-center" style={{ color: "var(--maroon)" }}>לא ניתן לטעון מעקב</p>
                        )}
                        {Array.isArray(trackResult) && trackResult.length > 0 && (
                          <div className="rounded-xl border overflow-hidden text-sm" style={{ borderColor: "var(--border)" }}>
                            {trackResult.map((s, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between px-4 py-2.5 border-b last:border-0"
                                style={{ borderColor: "var(--border)", background: i === 0 ? "#e8f5e9" : "transparent" }}
                              >
                                <span style={{ color: "var(--text-muted)" }}>{s.status_date} {s.status_time}</span>
                                <span className="font-medium text-right" style={{ color: i === 0 ? "var(--green)" : "var(--text)" }}>
                                  {s.status_desc}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {Array.isArray(trackResult) && trackResult.length === 0 && (
                          <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>אין עדכוני מעקב עדיין</p>
                        )}
                      </div>
                    ) : (
                      order.delivery > 0 && (
                        <p className="text-sm text-center py-2" style={{ color: "var(--text-muted)" }}>
                          {!process.env.HFD_CLIENT_NUMBER
                            ? "HFD לא מוגדר — מלא את פרטי HFD ב-.env"
                            : "משלוח לא נוצר עדיין ב-HFD"}
                        </p>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
