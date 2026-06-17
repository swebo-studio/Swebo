"use client";
import { useState, useEffect, useCallback } from "react";
import ConfirmModal from "@/components/ConfirmModal";

const STAGES = [
  { key: "received", label: "התקבל",  emoji: "📥" },
  { key: "packed",   label: "ארוז",    emoji: "📦" },
  { key: "shipped",  label: "במשלוח", emoji: "🚚" },
  { key: "done",     label: "בוצע",   emoji: "✅" },
] as const;
type Stage = typeof STAGES[number]["key"];

const NEXT_STAGE: Record<Stage, Stage | null> = {
  received: "packed",
  packed:   "shipped",
  shipped:  "done",
  done:     null,
};

const HFD_BASE = "https://api.hfd.co.il/rest/v2";

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
  orderStage: Stage;
  shipmentNumber: string | null;
  shipmentRandId: string | null;
  createdAt: string;
  items: OrderItem[];
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<Stage>("received");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState<string | null>(null);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Order | null>(null);

  const loadOrders = useCallback(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((data) => { setOrders(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  async function advanceStage(order: Order) {
    const next = NEXT_STAGE[order.orderStage];
    if (!next) return;
    setAdvancing(order.id);
    const res = await fetch(`/api/orders/${order.id}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: next }),
    });
    if (res.ok) {
      setOrders((prev) =>
        prev.map((o) => o.id === order.id ? { ...o, orderStage: next } : o)
      );
      setExpandedId(null);
    }
    setAdvancing(null);
  }

  async function markAsPaid(order: Order) {
    setMarkingPaid(order.id);
    const res = await fetch(`/api/orders/${order.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "paid" }),
    });
    if (res.ok) {
      setOrders((prev) =>
        prev.map((o) => o.id === order.id ? { ...o, status: "paid" } : o)
      );
    }
    setMarkingPaid(null);
  }

  async function deleteOrder(order: Order) {
    await fetch(`/api/orders/${order.id}`, { method: "DELETE" });
    setOrders((prev) => prev.filter((o) => o.id !== order.id));
    setPendingDelete(null);
  }

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const byStage = (stage: Stage) =>
    orders.filter((o) => o.status === "paid" && o.orderStage === stage);

  const stageCount = (stage: Stage) => byStage(stage).length;
  const visible = byStage(activeStage);

  if (loading) return (
    <p className="text-center py-20" style={{ color: "var(--text-muted)" }}>טוען...</p>
  );

  return (
    <>
    {pendingDelete && (
      <ConfirmModal
        message={`למחוק את ההזמנה של ${pendingDelete.customerName}?`}
        confirmLabel="מחק"
        danger
        onConfirm={() => deleteOrder(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
      />
    )}
    <div className="flex flex-col h-full" style={{ minHeight: "calc(100vh - 80px)" }}>

      {/* Pending orders — awaiting payment confirmation */}
      {pendingOrders.length > 0 && (
        <div className="mb-5 rounded-2xl border overflow-hidden" style={{ borderColor: "#f59e0b", background: "#fffbeb" }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "#f59e0b" }}>
            <span className="text-xs font-medium" style={{ color: "#92400e" }}>ממתינות לאישור תשלום — לחץ לסמן כשולם לאחר בדיקה</span>
            <span className="font-bold text-sm" style={{ color: "#92400e" }}>⏳ {pendingOrders.length} הזמנות</span>
          </div>
          <div className="flex flex-col divide-y" style={{ borderColor: "#fde68a" }}>
            {pendingOrders.map((order) => (
              <div key={order.id} className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => markAsPaid(order)}
                  disabled={markingPaid === order.id}
                  className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-opacity disabled:opacity-50"
                  style={{ background: "var(--text)", color: "var(--cream)" }}
                >
                  {markingPaid === order.id ? "..." : "✓ שולם"}
                </button>
                <button
                  onClick={() => setPendingDelete(order)}
                  className="flex-shrink-0 px-2 py-2 rounded-xl text-xs font-bold transition-opacity hover:opacity-70"
                  style={{ color: "var(--maroon)" }}
                  title="מחק הזמנה"
                >
                  🗑
                </button>
                <div className="flex-1 text-right min-w-0">
                  <p className="font-bold text-sm truncate" style={{ color: "var(--text)" }}>{order.customerName}</p>
                  <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                    {order.items.map((i) => `${i.product.nameHe} ×${i.quantity}`).join(" · ")}
                  </p>
                </div>
                <div className="text-left flex-shrink-0">
                  <p className="font-extrabold text-sm" style={{ color: "var(--text)" }}>₪{order.total}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {new Date(order.createdAt).toLocaleDateString("he-IL", { day: "numeric", month: "numeric" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stage tab bar */}
      <div
        className="flex rounded-2xl border overflow-hidden mb-5 text-sm"
        style={{ borderColor: "var(--border)", background: "var(--cream-dark)" }}
      >
        {STAGES.map(({ key, label, emoji }) => {
          const count = stageCount(key);
          const active = activeStage === key;
          return (
            <button
              key={key}
              onClick={() => { setActiveStage(key); setExpandedId(null); }}
              className="flex-1 flex flex-col items-center gap-0.5 py-3 transition-all relative"
              style={{
                background: active ? "var(--text)" : "transparent",
                color: active ? "var(--cream)" : count > 0 ? "var(--text)" : "var(--text-muted)",
                fontWeight: active ? 700 : 400,
              }}
            >
              <span className="text-base">{emoji}</span>
              <span className="text-xs leading-tight">{label}</span>
              {count > 0 && (
                <span
                  className="absolute top-1.5 right-1.5 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center"
                  style={{
                    background: active ? "var(--cream)" : "var(--maroon)",
                    color: active ? "var(--text)" : "white",
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Order list */}
      {visible.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
          <span className="text-4xl">{STAGES.find((s) => s.key === activeStage)?.emoji}</span>
          <p style={{ color: "var(--text-muted)" }}>אין הזמנות ב{STAGES.find((s) => s.key === activeStage)?.label}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((order) => {
            const isExpanded = expandedId === order.id;
            const next = NEXT_STAGE[order.orderStage];
            const nextLabel = next ? STAGES.find((s) => s.key === next)?.label : null;
            const nextEmoji = next ? STAGES.find((s) => s.key === next)?.emoji : null;

            return (
              <div
                key={order.id}
                className="rounded-2xl border overflow-hidden"
                style={{ background: "var(--cream-dark)", borderColor: "var(--border)" }}
              >
                {/* Card header — tap to expand */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer active:opacity-70"
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                >
                  {/* Expand chevron */}
                  <span style={{ color: "var(--text-muted)", fontSize: 12, flexShrink: 0 }}>
                    {isExpanded ? "▲" : "▼"}
                  </span>

                  {/* Order info */}
                  <div className="flex-1 text-right min-w-0">
                    <p className="font-bold text-base truncate" style={{ color: "var(--text)" }}>
                      {order.customerName}
                    </p>
                    <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                      {order.items.map((i) =>
                        `${i.product.nameHe} ×${i.quantity}${i.color ? ` ${i.color}` : ""} ${i.size}`
                      ).join(" · ")}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {new Date(order.createdAt).toLocaleDateString("he-IL", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })}
                      {order.shipmentNumber && (
                        <span className="mr-2 font-mono" style={{ color: "var(--green)" }}>
                          #{order.shipmentNumber}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Total */}
                  <div className="text-left flex-shrink-0">
                    <p className="font-extrabold text-base" style={{ color: "var(--text)" }}>₪{order.total}</p>
                  </div>
                </div>

                {/* Advance button — always visible */}
                {next && (
                  <div className="px-4 pb-4">
                    <button
                      onClick={() => advanceStage(order)}
                      disabled={advancing === order.id}
                      className="w-full py-3.5 rounded-xl font-bold text-base transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{ background: "var(--text)", color: "var(--cream)" }}
                    >
                      {advancing === order.id ? (
                        "מעדכן..."
                      ) : (
                        <>{nextEmoji} סמן כ{nextLabel}</>
                      )}
                    </button>
                  </div>
                )}

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t px-4 pb-4 pt-3 text-sm text-right" style={{ borderColor: "var(--border)" }}>
                    {/* Customer */}
                    <div className="mb-3" style={{ color: "var(--text-muted)" }}>
                      <p>{order.address}, {order.city}</p>
                      <a
                        href={`tel:${order.customerPhone}`}
                        className="underline"
                        style={{ color: "var(--text)" }}
                      >
                        {order.customerPhone}
                      </a>
                      <span className="mx-1">·</span>
                      <span>{order.customerEmail}</span>
                    </div>

                    {/* Items */}
                    <div className="border rounded-xl overflow-hidden mb-3" style={{ borderColor: "var(--border)" }}>
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between px-3 py-2 border-b last:border-0 text-xs"
                          style={{ borderColor: "var(--border)" }}
                        >
                          <span style={{ color: "var(--text-muted)" }}>₪{item.price * item.quantity}</span>
                          <span style={{ color: "var(--text)" }}>
                            {item.product.nameHe} ×{item.quantity}
                            {item.color ? ` · ${item.color}` : ""} / מידה {item.size}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between px-3 py-2 font-extrabold text-xs" style={{ background: "var(--cream)", color: "var(--text)" }}>
                        <span>₪{order.total}</span>
                        <span>סה&quot;כ{order.delivery === 0 ? " (ללא משלוח)" : ""}</span>
                      </div>
                    </div>

                    {/* HFD label */}
                    {order.shipmentNumber && (
                      <a
                        href={`${HFD_BASE}/shipments/${order.shipmentNumber}/label`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border font-medium transition-opacity hover:opacity-70 mb-2"
                        style={{ borderColor: "var(--border)", color: "var(--text)" }}
                      >
                        🖨️ הדפס תווית HFD
                      </a>
                    )}

                    {/* Delete */}
                    <button
                      onClick={() => setPendingDelete(order)}
                      className="w-full py-2.5 rounded-xl text-sm font-bold border transition-opacity hover:opacity-70"
                      style={{ borderColor: "var(--maroon)", color: "var(--maroon)", background: "transparent" }}
                    >
                      מחק הזמנה
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
    </>
  );
}
