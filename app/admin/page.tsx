import { prisma } from "@/lib/db";
import Link from "next/link";
import RecentOrdersTable from "@/components/RecentOrdersTable";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [orders, products] = await Promise.all([
    prisma.order.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.product.findMany({ include: { colors: { include: { sizes: true } } } }),
  ]);

  const paidOrders = orders.filter((o) => o.status === "paid");
  const revenue = paidOrders.reduce((s, o) => s + o.total, 0);
  const pendingOrders = orders.filter((o) => o.status === "pending").length;

  // Build per-size low-stock report for active products only
  const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"];
  type LowStockEntry = { id: string; nameHe: string; lines: string[] };
  const lowStock: LowStockEntry[] = [];
  for (const p of products) {
    if (!p.active) continue;
    const lines: string[] = [];
    if (p.colors.length > 0) {
      for (const color of p.colors) {
        if (color.sizes.length > 0) {
          const low = color.sizes
            .filter((s) => s.stock <= 3)
            .sort((a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size));
          if (low.length > 0) {
            const parts = low.map((s) => `${s.size} ×${s.stock}`).join(", ");
            lines.push(`${color.nameHe}: ${parts}`);
          }
        } else if (color.stock <= 3) {
          lines.push(`${color.nameHe}: ${color.stock} יח׳`);
        }
      }
    } else if (p.stock <= 3) {
      lines.push(`${p.stock} יחידות`);
    }
    if (lines.length > 0) lowStock.push({ id: p.id, nameHe: p.nameHe, lines });
  }

  const toProcess = paidOrders.filter((o) => (o as { orderStage?: string }).orderStage !== "done").length;

  const recentOrders = orders.slice(0, 8);

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-8" style={{ color: "var(--text)" }}>
        לוח בקרה
      </h1>

      {/* Order pipeline CTA */}
      <Link
        href="/admin/orders"
        className="flex items-center justify-between p-5 rounded-2xl border mb-6 transition-opacity hover:opacity-80"
        style={{ background: "var(--text)", borderColor: "var(--text)", color: "var(--cream)" }}
      >
        <div className="flex items-center gap-2 text-sm font-medium opacity-80">
          {toProcess > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-extrabold" style={{ background: "var(--cream)", color: "var(--text)" }}>
              {toProcess}
            </span>
          )}
          <span>{toProcess > 0 ? "הזמנות ממתינות לטיפול" : "כל ההזמנות טופלו ✓"}</span>
        </div>
        <div className="text-right">
          <p className="font-extrabold text-lg">ניהול הזמנות</p>
          <p className="text-sm opacity-70">התקבל · ארוז · במשלוח · בוצע</p>
        </div>
      </Link>

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
          <p className="font-bold mb-3" style={{ color: "#92400e" }}>
            מלאי נמוך
          </p>
          <div className="flex flex-col gap-2">
            {lowStock.map((item) => (
              <div key={item.id}>
                <p className="text-sm font-semibold" style={{ color: "#92400e" }}>{item.nameHe}</p>
                {item.lines.map((line, i) => (
                  <p key={i} className="text-xs mt-0.5" style={{ color: "#b45309" }}>{line}</p>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <RecentOrdersTable initial={recentOrders.map((o) => ({
        id: o.id,
        customerName: o.customerName,
        city: o.city,
        total: o.total,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
        deliveryMode: o.deliveryMode ?? null,
        pudoPointName: o.pudoPointName ?? null,
        address: o.address,
      }))} />
    </div>
  );
}
