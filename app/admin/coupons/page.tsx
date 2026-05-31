"use client";
import { useState, useEffect } from "react";

interface Coupon {
  id: string;
  code: string;
  discountPct: number;
  singleUse: boolean;
  expiresAt: string | null;
  usedAt: string | null;
  usedByEmail: string | null;
  createdAt: string;
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

  // Create form
  const [form, setForm] = useState({ code: "", discountPct: "10", expiresAt: "", singleUse: true });
  // Edit form
  const [editForm, setEditForm] = useState({ discountPct: "", expiresAt: "" });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
        discountPct: Number(form.discountPct),
        expiresAt: form.expiresAt || null,
        singleUse: form.singleUse,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "שגיאה"); setSaving(false); return; }
    setForm({ code: "", discountPct: "10", expiresAt: "", singleUse: true });
    setCreating(false);
    setSaving(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("למחוק קופון זה לצמיתות?")) return;
    await fetch("/api/admin/coupons", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  async function handleEdit(c: Coupon) {
    setEditingId(c.id);
    setEditForm({
      discountPct: String(c.discountPct),
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
        discountPct: Number(editForm.discountPct),
        expiresAt: editForm.expiresAt || null,
      }),
    });
    setEditingId(null);
    setSaving(false);
    load();
  }

  async function handleResetUsed(id: string) {
    if (!confirm("לאפס שימוש בקופון? הוא יהיה פעיל שוב.")) return;
    await fetch("/api/admin/coupons", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, resetUsed: true }),
    });
    load();
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

  return (
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
              <label className="text-sm text-right" style={{ color: "var(--text-muted)" }}>אחוז הנחה</label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: "var(--text)" }}>%</span>
                <input
                  type="number"
                  min={1} max={100}
                  value={form.discountPct}
                  onChange={(e) => setForm((f) => ({ ...f, discountPct: e.target.value }))}
                  required
                  className="flex-1 px-4 py-3 rounded-xl border text-right outline-none"
                  style={inputStyle}
                />
              </div>
              {/* Quick presets */}
              <div className="flex gap-2 justify-end flex-wrap mt-1">
                {[5, 10, 15, 20, 25, 50].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, discountPct: String(p) }))}
                    className="px-3 py-1 rounded-lg text-xs font-bold border transition-all"
                    style={{
                      borderColor: form.discountPct === String(p) ? "var(--text)" : "var(--border)",
                      background: form.discountPct === String(p) ? "var(--text)" : "transparent",
                      color: form.discountPct === String(p) ? "var(--cream)" : "var(--text-muted)",
                    }}
                  >
                    {p}%
                  </button>
                ))}
              </div>
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
                      </td>

                      {/* Discount */}
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="number" min={1} max={100}
                            value={editForm.discountPct}
                            onChange={(e) => setEditForm((f) => ({ ...f, discountPct: e.target.value }))}
                            className="w-16 px-2 py-1 rounded-lg border text-center outline-none text-sm"
                            style={inputStyle}
                          />
                        ) : (
                          <span className="font-bold" style={{ color: "var(--text)" }}>{c.discountPct}%</span>
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
  );
}
