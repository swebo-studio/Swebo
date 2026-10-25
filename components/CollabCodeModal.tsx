"use client";
import { useState, useEffect } from "react";
import ConfirmModal from "@/components/ConfirmModal";

export interface CollabTotals {
  orders: number;
  sales: number;
  earned: number;
  paid: number;
  due: number;
}

interface CollabCoupon {
  id: string;
  code: string;
  collab: boolean;
  collabName: string | null;
  collabPct: number | null;
  collabPhone: string | null;
}

interface Report {
  totals: CollabTotals;
  orders: { id: string; customerName: string; subtotal: number; collabCommission: number | null; createdAt: string }[];
  payouts: { id: string; amount: number; createdAt: string }[];
}

export function shekels(n: number) {
  return `₪${n.toLocaleString("he-IL", { maximumFractionDigits: 2 })}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/**
 * A content creator's code: its commission settings, what it has earned,
 * and the payouts made against it. Payouts only lower the balance due —
 * the sales and commissions behind it are never touched.
 */
export default function CollabCodeModal({ coupon, onClose, onSaved }: { coupon: CollabCoupon; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    // Opening this on a plain coupon is how one becomes a creator code, so
    // start ticked — unless it was a creator code that has since been turned off
    collab: coupon.collab || !coupon.collabPct,
    collabName: coupon.collabName ?? "",
    collabPct: coupon.collabPct ? String(coupon.collabPct) : "5",
    collabPhone: coupon.collabPhone ?? "",
  });
  const [isCollab, setIsCollab] = useState(coupon.collab);
  const [report, setReport] = useState<Report | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState<{ message: string; label: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    if (!isCollab) return;
    fetch(`/api/admin/coupons/${coupon.id}/collab`).then((r) => r.json()).then(setReport).catch(() => {});
  }, [coupon.id, isCollab]);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/coupons", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: coupon.id, ...form, collabPct: form.collab ? Number(form.collabPct) : undefined }),
    });
    setSaving(false);
    if (!res.ok) { setError("שמירה נכשלה"); return; }
    setIsCollab(form.collab);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSaved();
  }

  async function recordPayout(body: { amount?: number; all?: boolean }) {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/admin/coupons/${coupon.id}/collab`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "שגיאה"); return; }
    setReport(data);
    setPayAmount("");
    onSaved();
  }

  async function undoPayout(payoutId: string) {
    const res = await fetch(`/api/admin/coupons/${coupon.id}/collab`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payoutId }),
    });
    if (res.ok) { setReport(await res.json()); onSaved(); }
  }

  const inputStyle = { background: "var(--cream-dark)", borderColor: "var(--border)", color: "var(--text)" };
  const t = report?.totals;

  return (
    <>
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-6 flex flex-col gap-5 text-right"
        style={{ background: "var(--cream)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <button onClick={onClose} aria-label="סגור" className="text-xl leading-none px-2" style={{ color: "var(--text-muted)" }}>×</button>
          <h2 className="font-extrabold text-lg" style={{ color: "var(--text)" }}>
            שיתוף פעולה · <span className="font-mono">{coupon.code}</span>
          </h2>
        </div>

        {/* Settings */}
        <form onSubmit={saveSettings} className="flex flex-col gap-3 rounded-2xl border p-4" style={{ borderColor: "var(--border)" }}>
          <label className="flex items-center justify-end gap-2 cursor-pointer select-none text-sm font-bold" style={{ color: "var(--text)" }}>
            קוד שיתוף פעולה ליוצר תוכן
            <input type="checkbox" checked={form.collab} onChange={(e) => setForm((f) => ({ ...f, collab: e.target.checked }))} className="w-4 h-4" />
          </label>
          {form.collab && (
            <>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                כל הזמנה ששולמה עם הקוד נרשמת ליוצר — גם כשבסל כבר יש מבצע והקוד לא נותן הנחה נוספת. העמלה מחושבת מסכום המוצרים ששולם בפועל, אחרי כל ההנחות וללא משלוח. הקוד רב-פעמי.
              </p>
              <div className="flex flex-col gap-1">
                <label htmlFor="collab-name" className="text-sm" style={{ color: "var(--text-muted)" }}>שם יוצר התוכן</label>
                <input id="collab-name" value={form.collabName} onChange={(e) => setForm((f) => ({ ...f, collabName: e.target.value }))}
                  placeholder="אורי" className="px-4 py-2.5 rounded-xl border text-right outline-none" style={inputStyle} />
              </div>
              <div className="flex gap-3">
                <div className="flex flex-col gap-1 flex-1">
                  <label htmlFor="collab-phone" className="text-sm" style={{ color: "var(--text-muted)" }}>טלפון לעדכונים (SMS)</label>
                  <input id="collab-phone" type="tel" dir="ltr" value={form.collabPhone} onChange={(e) => setForm((f) => ({ ...f, collabPhone: e.target.value }))}
                    placeholder="050-0000000" className="px-4 py-2.5 rounded-xl border text-right outline-none" style={inputStyle} />
                </div>
                <div className="flex flex-col gap-1 w-28">
                  <label htmlFor="collab-pct" className="text-sm" style={{ color: "var(--text-muted)" }}>עמלה (%)</label>
                  <input id="collab-pct" type="number" min={0.1} max={100} step={0.1} required value={form.collabPct}
                    onChange={(e) => setForm((f) => ({ ...f, collabPct: e.target.value }))}
                    className="px-4 py-2.5 rounded-xl border text-center outline-none" style={inputStyle} />
                </div>
              </div>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                היוצר יקבל בכל הזמנה רק את שם הלקוח, סכום המוצרים והעמלה — בלי טלפון, כתובת או פרטי משלוח. שינוי אחוז העמלה חל רק על הזמנות חדשות.
              </p>
            </>
          )}
          <button type="submit" disabled={saving} className="self-start px-5 py-2 rounded-xl font-bold text-sm disabled:opacity-50" style={{ background: "var(--text)", color: "var(--cream)" }}>
            {saved ? "נשמר ✓" : "שמור הגדרות"}
          </button>
        </form>

        {/* Balance */}
        {isCollab && t && (
          <>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "מכירות דרך הקוד", value: shekels(t.sales), sub: `${t.orders} הזמנות` },
                { label: "עמלות שנצברו", value: shekels(t.earned) },
                { label: "שולם ליוצר", value: shekels(t.paid) },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border p-3 text-center" style={{ borderColor: "var(--border)" }}>
                  <div className="text-lg font-extrabold" style={{ color: "var(--text)" }}>{s.value}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{s.label}</div>
                  {s.sub && <div className="text-xs" style={{ color: "var(--text-muted)" }}>{s.sub}</div>}
                </div>
              ))}
            </div>
            <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: t.due > 0 ? "#fff6e5" : "#e8f5e9" }}>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-extrabold" style={{ color: t.due > 0 ? "#b26a00" : "var(--green)" }}>{shekels(t.due)}</span>
                <span className="font-bold text-sm" style={{ color: "var(--text)" }}>יתרה לתשלום</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button" disabled={saving || t.due <= 0}
                  onClick={() => setConfirm({ message: `לסמן ${shekels(t.due)} כשולם ליוצר?`, label: "סמן כשולם", onConfirm: () => { setConfirm(null); recordPayout({ all: true }); } })}
                  className="px-4 py-2 rounded-xl font-bold text-sm disabled:opacity-40" style={{ background: "var(--green)", color: "#fff" }}
                >סמן הכל כשולם</button>
                <div className="flex gap-2 flex-1 min-w-[180px]">
                  <label htmlFor="pay-amount" className="sr-only">סכום ששולם</label>
                  <input id="pay-amount" type="number" min={0.01} step={0.01} value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="סכום ששולם ₪" className="flex-1 min-w-0 px-3 py-2 rounded-xl border text-right outline-none text-sm" style={inputStyle} />
                  <button type="button" disabled={saving || !(Number(payAmount) > 0)} onClick={() => recordPayout({ amount: Number(payAmount) })}
                    className="px-3 py-2 rounded-xl border font-bold text-sm disabled:opacity-40" style={{ borderColor: "var(--text)", color: "var(--text)" }}>רשום תשלום</button>
                </div>
              </div>
            </div>
          </>
        )}

        {error && <p className="text-sm text-center" style={{ color: "var(--maroon)" }}>{error}</p>}

        {isCollab && report && report.payouts.length > 0 && (
          <div className="flex flex-col gap-1">
            <h3 className="font-bold text-sm" style={{ color: "var(--text)" }}>תשלומים ליוצר</h3>
            {report.payouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm py-1.5 border-b" style={{ borderColor: "var(--border)" }}>
                <button type="button" title="בטל תשלום שנרשם בטעות" aria-label="בטל תשלום"
                  onClick={() => setConfirm({ message: `לבטל את התשלום של ${shekels(p.amount)} מ-${fmtDate(p.createdAt)}? הסכום יחזור ליתרה לתשלום.`, label: "בטל תשלום", onConfirm: () => { setConfirm(null); undoPayout(p.id); } })}
                  className="text-xs px-2" style={{ color: "var(--maroon)" }}>ביטול</button>
                <span style={{ color: "var(--text)" }}>{fmtDate(p.createdAt)} · <b>{shekels(p.amount)}</b></span>
              </div>
            ))}
          </div>
        )}

        {isCollab && report && (
          <div className="flex flex-col gap-1">
            <h3 className="font-bold text-sm" style={{ color: "var(--text)" }}>הזמנות דרך הקוד</h3>
            {report.orders.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>עדיין אין הזמנות ששולמו עם הקוד</p>
            ) : (
              <table className="w-full text-sm text-right">
                <thead>
                  <tr style={{ color: "var(--text-muted)" }}>
                    <th className="py-1 font-medium">תאריך</th>
                    <th className="py-1 font-medium">לקוח</th>
                    <th className="py-1 font-medium">מוצרים</th>
                    <th className="py-1 font-medium">עמלה</th>
                  </tr>
                </thead>
                <tbody>
                  {report.orders.map((o) => (
                    <tr key={o.id} className="border-t" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
                      <td className="py-1.5">{fmtDate(o.createdAt)}</td>
                      <td className="py-1.5">{o.customerName}</td>
                      <td className="py-1.5">{shekels(o.subtotal)}</td>
                      <td className="py-1.5 font-bold">{shekels(o.collabCommission ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
    {confirm && (
      <ConfirmModal message={confirm.message} confirmLabel={confirm.label} danger={false} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />
    )}
    </>
  );
}
