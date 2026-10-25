"use client";
import { useState, useEffect } from "react";
import ConfirmModal from "@/components/ConfirmModal";
import CollabCodeModal, { shekels, type CollabTotals } from "@/components/CollabCodeModal";
import { freeShippingLabel, type FreeShippingScope } from "@/lib/shippingScope";

type DiscountType = "pct" | "amount" | "shipping";
const TYPE_LABELS: Record<DiscountType, string> = { pct: "אחוזים (%)", amount: "שקלים (₪)", shipping: "משלוח חינם" };
const SCOPES: { value: FreeShippingScope; label: string }[] = [
  { value: "all", label: "בית + נקודת איסוף" },
  { value: "home", label: "עד הבית" },
  { value: "epost", label: "נקודת איסוף" },
];

/** What the coupon gives, for the table */
function couponValue(c: Coupon) {
  if (c.freeShipping) return freeShippingLabel(c.freeShipping);
  return c.discountAmount ? `₪${c.discountAmount}` : `${c.discountPct}%`;
}

interface Coupon {
  id: string;
  code: string;
  discountPct: number | null;
  discountAmount: number | null;
  freeShipping: FreeShippingScope | null;
  singleUse: boolean;
  expiresAt: string | null;
  usedAt: string | null;
  usedByEmail: string | null;
  createdAt: string;
  collab: boolean;
  collabName: string | null;
  collabPct: number | null;
  collabPhone: string | null;
  collabTotals: CollabTotals | null;
}

function statusLabel(c: Coupon): { label: string; color: string; bg: string } {
  if (c.singleUse && c.usedAt) return { label: "נוצל", color: "var(--maroon)", bg: "#f5e8e8" };
  if (c.expiresAt && new Date(c.expiresAt) < new Date()) return { label: "פג תוקף", color: "#888", bg: "#f0f0f0" };
  return { label: "פעיל", color: "var(--green)", bg: "#e8f5e9" };
}

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [collabId, setCollabId] = useState<string | null>(null);

  // Create form
  const emptyForm = { code: "", discountType: "pct" as DiscountType, discountPct: "10", discountAmount: "", freeShipping: "all" as FreeShippingScope, expiresAt: "", singleUse: true };
  const [form, setForm] = useState(emptyForm);
  // Edit form
  const [editForm, setEditForm] = useState({ discountType: "pct" as DiscountType, discountPct: "", discountAmount: "", freeShipping: "all" as FreeShippingScope, expiresAt: "" });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/coupons");
    setCoupons(await res.json());
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: form.code || undefined,
        discountPct: form.discountType === "pct" ? Number(form.discountPct) : undefined,
        discountAmount: form.discountType === "amount" ? Number(form.discountAmount) : undefined,
        freeShipping: form.discountType === "shipping" ? form.freeShipping : undefined,
        expiresAt: form.expiresAt || null,
        singleUse: form.singleUse,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "שגיאה"); setSaving(false); return; }
    setForm(emptyForm);
    setCreating(false);
    setSaving(false);
    load();
  }

  async function handleDelete(id: string) {
    setConfirm({ message: "למחוק קופון זה לצמיתות?", onConfirm: async () => {
      setConfirm(null);
      const res = await fetch("/api/admin/coupons", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (!res.ok) alert((await res.json().catch(() => ({}))).error || "המחיקה נכשלה");
      load();
    }});
  }

  async function handleEdit(c: Coupon) {
    setEditingId(c.id);
    setEditForm({
      discountType: c.freeShipping ? "shipping" : c.discountAmount ? "amount" : "pct",
      discountPct: c.discountPct ? String(c.discountPct) : "",
      discountAmount: c.discountAmount ? String(c.discountAmount) : "",
      freeShipping: c.freeShipping ?? "all",
      expiresAt: c.expiresAt ? c.expiresAt.split("T")[0] : "",
    });
  }

  async function handleSaveEdit(id: string) {
    setSaving(true);
    await fetch("/api/admin/coupons", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        discountPct: editForm.discountType === "pct" ? Number(editForm.discountPct) : null,
        discountAmount: editForm.discountType === "amount" ? Number(editForm.discountAmount) : null,
        freeShipping: editForm.discountType === "shipping" ? editForm.freeShipping : null,
        expiresAt: editForm.expiresAt || null,
      }),
    });
    setEditingId(null);
    setSaving(false);
    load();
  }

  async function handleResetUsed(id: string) {
    setConfirm({ message: "לאפס שימוש בקופון? הוא יהיה פעיל שוב.", onConfirm: async () => {
      setConfirm(null);
      await fetch("/api/admin/coupons", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, resetUsed: true }) });
      load();
    }});
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  const inputStyle = { background: "var(--cream-dark)", borderColor: "var(--border)", color: "var(--text)" };

  const active = coupons.filter((c) => !(c.singleUse && c.usedAt) && (!c.expiresAt || new Date(c.expiresAt) >= new Date())).length;
  const used   = coupons.filter((c) => c.singleUse && c.usedAt).length;
  const expired = coupons.filter((c) => !c.usedAt && c.expiresAt && new Date(c.expiresAt) < new Date()).length;
  const collabs = coupons.filter((c) => c.collab);
  const collabCoupon = coupons.find((c) => c.id === collabId);

  return (
    <>
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => { setCreating(true); setError(""); }}
          className="px-5 py-2.5 rounded-xl font-bold text-sm transition-opacity hover:opacity-80"
          style={{ background: "var(--text)", color: "var(--cream)" }}
        >
          + קופון חדש
        </button>
        <h1 className="text-2xl font-extrabold" style={{ color: "var(--text)" }}>ניהול קופונים</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "פעילים", value: active, color: "var(--green)", bg: "#e8f5e9" },
          { label: "נוצלו", value: used, color: "var(--maroon)", bg: "#f5e8e8" },
          { label: "פגי תוקף", value: expired, color: "#888", bg: "#f0f0f0" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border p-4 text-center" style={{ borderColor: "var(--border)", background: s.bg }}>
            <div className="text-2xl font-extrabold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-sm mt-1" style={{ color: s.color }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Creator codes */}
      {collabs.length > 0 && (
        <div className="mb-8">
          <h2 className="font-extrabold text-lg text-right mb-3" style={{ color: "var(--text)" }}>שיתופי פעולה עם יוצרי תוכן</h2>
          <div className="rounded-2xl border overflow-x-auto" style={{ borderColor: "var(--border)" }}>
            <table className="w-full text-sm text-right">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--cream-dark)" }}>
                  {["קוד", "יוצר", "עמלה", "מכירות", "עמלות שנצברו", "שולם", "יתרה לתשלום", ""].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium whitespace-nowrap" style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {collabs.map((c) => {
                  const t = c.collabTotals;
                  return (
                    <tr key={c.id} style={{ borderBottom: "1px solid var(--border)", color: "var(--text)" }}>
                      <td className="px-4 py-3 font-mono font-bold">{c.code}</td>
                      <td className="px-4 py-3">{c.collabName || "—"}</td>
                      <td className="px-4 py-3">{c.collabPct ?? 0}%</td>
                      <td className="px-4 py-3 whitespace-nowrap">{shekels(t?.sales ?? 0)} <span className="text-xs" style={{ color: "var(--text-muted)" }}>({t?.orders ?? 0})</span></td>
                      <td className="px-4 py-3">{shekels(t?.earned ?? 0)}</td>
                      <td className="px-4 py-3">{shekels(t?.paid ?? 0)}</td>
                      <td className="px-4 py-3 font-extrabold" style={{ color: (t?.due ?? 0) > 0 ? "#b26a00" : "var(--green)" }}>{shekels(t?.due ?? 0)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setCollabId(c.id)} className="text-xs px-3 py-1 rounded-lg font-bold whitespace-nowrap" style={{ background: "var(--text)", color: "var(--cream)" }}>ניהול ותשלום</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create modal */}
      {creating && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-sm rounded-3xl p-6 flex flex-col gap-4"
            style={{ background: "var(--cream)" }}
          >
            <h2 className="font-extrabold text-lg text-right" style={{ color: "var(--text)" }}>קופון חדש</h2>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-right" style={{ color: "var(--text-muted)" }}>קוד (ריק = אקראי)</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="SWEBO-XXXXX"
                className="px-4 py-3 rounded-xl border text-right outline-none"
                style={inputStyle}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-right" style={{ color: "var(--text-muted)" }}>סוג הנחה</label>
              <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                {(["pct", "amount", "shipping"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, discountType: t }))}
                    className="flex-1 py-2 text-sm font-bold transition-all whitespace-nowrap"
                    style={{
                      background: form.discountType === t ? "var(--text)" : "transparent",
                      color: form.discountType === t ? "var(--cream)" : "var(--text-muted)",
                    }}
                  >
                    {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
              {form.discountType === "pct" ? (
                <>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-bold" style={{ color: "var(--text)" }}>%</span>
                    <input
                      type="number" min={1} max={100}
                      value={form.discountPct}
                      onChange={(e) => setForm((f) => ({ ...f, discountPct: e.target.value }))}
                      required
                      className="flex-1 px-4 py-3 rounded-xl border text-right outline-none"
                      style={inputStyle}
                    />
                  </div>
                  <div className="flex gap-2 justify-end flex-wrap mt-1">
                    {[5, 10, 15, 20, 25, 50].map((p) => (
                      <button
                        key={p} type="button"
                        onClick={() => setForm((f) => ({ ...f, discountPct: String(p) }))}
                        className="px-3 py-1 rounded-lg text-xs font-bold border transition-all"
                        style={{
                          borderColor: form.discountPct === String(p) ? "var(--text)" : "var(--border)",
                          background: form.discountPct === String(p) ? "var(--text)" : "transparent",
                          color: form.discountPct === String(p) ? "var(--cream)" : "var(--text-muted)",
                        }}
                      >{p}%</button>
                    ))}
                  </div>
                </>
              ) : form.discountType === "shipping" ? (
                <div className="flex flex-col gap-1.5 mt-1">
                  <span className="text-sm text-right" style={{ color: "var(--text-muted)" }}>על איזה משלוח?</span>
                  <div className="flex gap-2 flex-wrap justify-end">
                    {SCOPES.map(({ value, label }) => (
                      <button
                        key={value} type="button"
                        onClick={() => setForm((f) => ({ ...f, freeShipping: value }))}
                        aria-pressed={form.freeShipping === value}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold border transition-all"
                        style={{
                          borderColor: form.freeShipping === value ? "var(--text)" : "var(--border)",
                          background: form.freeShipping === value ? "var(--text)" : "transparent",
                          color: form.freeShipping === value ? "var(--cream)" : "var(--text-muted)",
                        }}
                      >{label}</button>
                    ))}
                  </div>
                  <p className="text-xs text-right" style={{ color: "var(--text-muted)" }}>הלקוח משלם רק על המוצרים. באיסוף עצמי המשלוח ממילא חינם, והקופון לא ינוצל.</p>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-bold" style={{ color: "var(--text)" }}>₪</span>
                  <input
                    type="number" min={1}
                    value={form.discountAmount}
                    onChange={(e) => setForm((f) => ({ ...f, discountAmount: e.target.value }))}
                    required
                    placeholder="50"
                    className="flex-1 px-4 py-3 rounded-xl border text-right outline-none"
                    style={inputStyle}
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-right" style={{ color: "var(--text-muted)" }}>תאריך תפוגה (ריק = ללא הגבלה)</label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                className="px-4 py-3 rounded-xl border outline-none text-right"
                style={inputStyle}
              />
            </div>

            {/* Single use toggle */}
            <label className="flex items-center justify-end gap-3 cursor-pointer select-none">
              <span className="text-sm text-right" style={{ color: "var(--text-muted)" }}>
                {form.singleUse ? "חד-פעמי" : "רב-פעמי"}
              </span>
              <div
                className="relative w-12 h-6 rounded-full transition-colors"
                style={{ background: form.singleUse ? "var(--text)" : "var(--green)" }}
                onClick={() => setForm((f) => ({ ...f, singleUse: !f.singleUse }))}
              >
                <div
                  className="absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow"
                  style={{ transform: form.singleUse ? "translateX(-28px)" : "translateX(-4px)" }}
                />
              </div>
            </label>

            {error && <p className="text-sm text-center" style={{ color: "var(--maroon)" }}>{error}</p>}

            <div className="flex gap-3 mt-2">
              <button type="button" onClick={() => setCreating(false)} className="flex-1 py-3 rounded-xl border font-medium" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>ביטול</button>
              <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl font-bold disabled:opacity-50" style={{ background: "var(--text)", color: "var(--cream)" }}>
                {saving ? "יוצר..." : "צור קופון"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
        {loading ? (
          <p className="p-10 text-center" style={{ color: "var(--text-muted)" }}>טוען...</p>
        ) : coupons.length === 0 ? (
          <p className="p-10 text-center" style={{ color: "var(--text-muted)" }}>אין קופונים עדיין</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--cream-dark)" }}>
                  {["קוד", "הנחה", "סוג", "תפוגה", "נוצל על ידי", "סטטוס", "פעולות"].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => {
                  const st = statusLabel(c);
                  const isEditing = editingId === c.id;
                  return (
                    <tr key={c.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      {/* Code */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => copyCode(c.code)}
                          className="font-mono font-bold text-sm flex items-center gap-1.5 hover:opacity-70 transition-opacity"
                          style={{ color: "var(--text)" }}
                          title="לחץ להעתקה"
                        >
                          {c.code}
                        </button>
                        {c.collab && (
                          <span className="mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "#fff6e5", color: "#b26a00" }}>
                            שת״פ{c.collabName ? ` · ${c.collabName}` : ""}
                          </span>
                        )}
                      </td>

                      {/* Discount */}
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex rounded-lg overflow-hidden border text-xs" style={{ borderColor: "var(--border)" }}>
                              {(["pct", "amount", "shipping"] as const).map((t) => (
                                <button key={t} type="button" onClick={() => setEditForm((f) => ({ ...f, discountType: t }))}
                                  className="flex-1 py-1 font-bold transition-all"
                                  style={{ background: editForm.discountType === t ? "var(--text)" : "transparent", color: editForm.discountType === t ? "var(--cream)" : "var(--text-muted)" }}>
                                  {t === "pct" ? "%" : t === "amount" ? "₪" : "משלוח"}
                                </button>
                              ))}
                            </div>
                            {editForm.discountType === "shipping" ? (
                              <select value={editForm.freeShipping} aria-label="על איזה משלוח"
                                onChange={(e) => setEditForm((f) => ({ ...f, freeShipping: e.target.value as FreeShippingScope }))}
                                className="px-2 py-1 rounded-lg border outline-none text-sm" style={inputStyle}>
                                {SCOPES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                              </select>
                            ) : editForm.discountType === "pct" ? (
                              <input type="number" min={1} max={100} value={editForm.discountPct}
                                onChange={(e) => setEditForm((f) => ({ ...f, discountPct: e.target.value }))}
                                className="w-16 px-2 py-1 rounded-lg border text-center outline-none text-sm" style={inputStyle} />
                            ) : (
                              <input type="number" min={1} value={editForm.discountAmount}
                                onChange={(e) => setEditForm((f) => ({ ...f, discountAmount: e.target.value }))}
                                className="w-16 px-2 py-1 rounded-lg border text-center outline-none text-sm" style={inputStyle} />
                            )}
                          </div>
                        ) : (
                          <span className="font-bold" style={{ color: "var(--text)" }}>
                            {couponValue(c)}
                          </span>
                        )}
                      </td>

                      {/* Single/Multi use */}
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ background: c.singleUse ? "#f0f0f0" : "#e8f5e9", color: c.singleUse ? "#888" : "var(--green)" }}>
                          {c.singleUse ? "חד-פעמי" : "רב-פעמי"}
                        </span>
                      </td>

                      {/* Expiry */}
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editForm.expiresAt}
                            onChange={(e) => setEditForm((f) => ({ ...f, expiresAt: e.target.value }))}
                            className="px-2 py-1 rounded-lg border outline-none text-sm"
                            style={inputStyle}
                          />
                        ) : (
                          <span style={{ color: c.expiresAt && new Date(c.expiresAt) < new Date() ? "var(--maroon)" : "var(--text-muted)" }}>
                            {fmt(c.expiresAt)}
                          </span>
                        )}
                      </td>

                      {/* Used by */}
                      <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>
                        {c.usedByEmail || (c.usedAt ? fmt(c.usedAt) : "—")}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ background: st.bg, color: st.color }}>
                          {st.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          {isEditing ? (
                            <>
                              <button onClick={() => setEditingId(null)} className="text-xs px-2 py-1 rounded-lg border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>ביטול</button>
                              <button onClick={() => handleSaveEdit(c.id)} disabled={saving} className="text-xs px-2 py-1 rounded-lg font-bold" style={{ background: "var(--text)", color: "var(--cream)" }}>שמור</button>
                            </>
                          ) : (
                            <>
                              {c.usedAt && (
                                <button onClick={() => handleResetUsed(c.id)} className="text-xs px-2 py-1 rounded-lg border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }} title="אפס שימוש">↩</button>
                              )}
                              <button onClick={() => setCollabId(c.id)} className="text-xs px-2 py-1 rounded-lg border whitespace-nowrap" style={{ borderColor: c.collab ? "#b26a00" : "var(--border)", color: c.collab ? "#b26a00" : "var(--text)" }} title="קוד שיתוף פעולה ליוצר תוכן">שת״פ</button>
                              <button onClick={() => handleEdit(c)} className="text-xs px-2 py-1 rounded-lg border" style={{ borderColor: "var(--border)", color: "var(--text)" }}>עריכה</button>
                              <button onClick={() => handleDelete(c.id)} className="text-xs px-2 py-1 rounded-lg border" style={{ borderColor: "#f5e8e8", color: "var(--maroon)" }}>מחק</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    {collabCoupon && (
      <CollabCodeModal coupon={collabCoupon} onClose={() => setCollabId(null)} onSaved={load} />
    )}
    {confirm && (
      <ConfirmModal
        message={confirm.message}
        confirmLabel="אישור"
        danger={confirm.message.includes("מחק")}
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm(null)}
      />
    )}
    </>
  );
}
