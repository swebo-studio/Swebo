import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function fmt(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function AdminNewsletterPage() {
  const signups = await prisma.newsletter.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>{signups.length} נרשמים</span>
        <h1 className="text-2xl font-extrabold" style={{ color: "var(--text)" }}>נרשמים לקופון 5%</h1>
      </div>

      {signups.length === 0 ? (
        <div className="rounded-2xl border p-16 text-center" style={{ borderColor: "var(--border)" }}>
          <p style={{ color: "var(--text-muted)" }}>אין נרשמים עדיין</p>
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--cream-dark)" }}>
                  {["טלפון", "קוד קופון", "נרשם בתאריך", "נוצל", "תזכורת נשלחה"].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {signups.map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--text)" }}>
                      <a href={`tel:${s.phone}`} className="underline hover:opacity-70">{s.phone}</a>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text-muted)" }}>{s.couponCode}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>{fmt(s.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-1 rounded-full text-xs font-bold"
                        style={{
                          background: s.usedAt ? "#e8f5e9" : "#f0f0f0",
                          color: s.usedAt ? "var(--green)" : "#888",
                        }}
                      >
                        {s.usedAt ? `נוצל ${fmt(s.usedAt)}` : "לא נוצל"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>{fmt(s.reminderSentAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
