"use client";
import { useState } from "react";

interface WindowStats { revenue: number; paidCount: number }

export default function DashboardKpis({
  allTime,
  last30,
  pendingOrders,
  activeProducts,
}: {
  allTime: WindowStats;
  last30: WindowStats;
  pendingOrders: number;
  activeProducts: number;
}) {
  const [range, setRange] = useState<"all" | "30d">("all");
  const stats = range === "all" ? allTime : last30;

  const ranges = [
    { key: "30d" as const, label: "30 ימים אחרונים" },
    { key: "all" as const, label: "כל הזמן" },
  ];

  return (
    <div className="mb-10">
      <div className="flex justify-end gap-2 mb-3">
        {ranges.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className="px-3 py-1.5 rounded-full text-sm font-bold border transition-opacity hover:opacity-80"
            style={
              range === r.key
                ? { background: "var(--text)", borderColor: "var(--text)", color: "var(--cream)" }
                : { background: "var(--cream-dark)", borderColor: "var(--border)", color: "var(--text-muted)" }
            }
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "הכנסות (שולמו)", value: `₪${stats.revenue.toLocaleString()}`, color: "var(--green)" },
          { label: "הזמנות שולמו", value: stats.paidCount, color: "var(--text)" },
          { label: "ממתינות לתשלום", value: pendingOrders, color: "#b08c00" },
          { label: "מוצרים פעילים", value: activeProducts, color: "var(--text)" },
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
    </div>
  );
}
