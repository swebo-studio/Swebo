"use client";
import { useState } from "react";
import type { EarningsMonth, MonthKey, ShippingMonth } from "@/lib/shippingRevenue";

const MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

interface WindowStats { revenue: number; paidCount: number }

export default function DashboardKpis({
  allTime,
  last30,
  pendingOrders,
  activeProducts,
  shipping,
  earnings,
  currentMonth,
}: {
  allTime: WindowStats;
  last30: WindowStats;
  pendingOrders: number;
  activeProducts: number;
  shipping: Record<MonthKey, ShippingMonth>;
  earnings: Record<MonthKey, EarningsMonth>;
  /** "YYYY-MM" in Israel time, from the server so both renders agree */
  currentMonth: MonthKey;
}) {
  const [range, setRange] = useState<"all" | "30d">("all");
  const [revenueShown, setRevenueShown] = useState(false);
  const stats = range === "all" ? allTime : last30;

  const [curYear, curMonth] = currentMonth.split("-").map(Number);
  const [year, setYear] = useState(curYear);
  const [month, setMonth] = useState(curMonth);
  // Every year with orders, through the current one
  const firstYear = Math.min(curYear, ...Object.keys(earnings).map((k) => Number(k.slice(0, 4))));
  const years = Array.from({ length: curYear - firstYear + 1 }, (_, i) => curYear - i);
  const key = `${year}-${String(month).padStart(2, "0")}`;
  const ship = shipping[key] ?? { collected: 0, refunded: 0, paidShippingCount: 0 };
  const shipNet = ship.collected - ship.refunded;
  const earn = earnings[key] ?? { collected: 0, refunded: 0, paidCount: 0 };
  const earnNet = earn.collected - earn.refunded;
  const blurStyle = { filter: revenueShown ? "none" : "blur(9px)", userSelect: revenueShown ? "auto" : "none" } as const;
  const money = (n: number) => `₪${n.toLocaleString()}`;
  const selectStyle = { background: "var(--cream)", borderColor: "var(--border)", color: "var(--text)" };

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
          { label: "הכנסות (שולמו)", value: `₪${stats.revenue.toLocaleString()}`, color: "var(--green)", secret: true },
          { label: "הזמנות שולמו", value: stats.paidCount, color: "var(--text)" },
          { label: "ממתינות לתשלום", value: pendingOrders, color: "#b08c00" },
          { label: "מוצרים פעילים", value: activeProducts, color: "var(--text)" },
        ].map((card) => {
          const hidden = card.secret && !revenueShown;
          return (
            <div
              key={card.label}
              className="p-5 rounded-2xl border text-right"
              style={{ background: "var(--cream-dark)", borderColor: "var(--border)" }}
            >
              <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
                {card.label}
              </p>
              {card.secret ? (
                <button
                  type="button"
                  onClick={() => setRevenueShown((v) => !v)}
                  aria-label={hidden ? "הצג הכנסות" : "הסתר הכנסות"}
                  title={hidden ? "לחצו כדי להציג" : "לחצו כדי להסתיר"}
                  className="block w-full text-right text-2xl font-extrabold cursor-pointer transition-all"
                  style={{
                    color: card.color,
                    filter: hidden ? "blur(9px)" : "none",
                    userSelect: hidden ? "none" : "auto",
                  }}
                >
                  {card.value}
                </button>
              ) : (
                <p className="text-2xl font-extrabold" style={{ color: card.color }}>
                  {card.value}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Month by month: what customers paid, and the delivery fees within it */}
      <div className="mt-4 p-5 rounded-2xl border text-right" style={{ background: "var(--cream-dark)", borderColor: "var(--border)" }}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="text-sm font-bold" style={{ color: "var(--text)" }}>לפי חודש</p>
          <div className="flex gap-2">
            <select
              aria-label="חודש"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-3 py-1.5 rounded-full text-sm font-bold border"
              style={selectStyle}
            >
              {MONTHS.map((name, i) => (
                <option key={name} value={i + 1}>{name}</option>
              ))}
            </select>
            <select
              aria-label="שנה"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-3 py-1.5 rounded-full text-sm font-bold border"
              style={selectStyle}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setRevenueShown((v) => !v)}
          aria-label={revenueShown ? "הסתר הכנסות" : "הצג הכנסות"}
          title={revenueShown ? "לחצו כדי להסתיר" : "לחצו כדי להציג"}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full text-right cursor-pointer"
        >
          <span className="block p-4 rounded-xl" style={{ background: "var(--cream)" }}>
            <span className="block text-sm mb-1" style={{ color: "var(--text-muted)" }}>הכנסות (שולמו)</span>
            <span className="block transition-all" style={blurStyle}>
              <span className="block text-2xl font-extrabold" style={{ color: "var(--green)" }}>{money(earnNet)}</span>
              <span className="block text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                {earn.paidCount} הזמנות שולמו
                {earn.refunded > 0 && ` · נגבו ${money(earn.collected)} · הוחזרו בביטולים ${money(earn.refunded)}`}
              </span>
            </span>
          </span>
          {/* Delivery fees customers paid — not what HFD charges the shop */}
          <span className="block p-4 rounded-xl" style={{ background: "var(--cream)" }}>
            <span className="block text-sm mb-1" style={{ color: "var(--text-muted)" }}>מתוכן דמי משלוח (שולמו ע״י לקוחות)</span>
            <span className="block transition-all" style={blurStyle}>
              <span className="block text-2xl font-extrabold" style={{ color: "var(--green)" }}>{money(shipNet)}</span>
              <span className="block text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                {ship.paidShippingCount} הזמנות שילמו על משלוח · נגבו {money(ship.collected)}
                {ship.refunded > 0 && ` · הוחזרו בביטולים ${money(ship.refunded)}`}
              </span>
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
