"use client";
import { useState, useEffect } from "react";
import ConfirmModal from "@/components/ConfirmModal";

interface Product { id: string; nameHe: string; price: number }

interface Condition {
  id?: string;
  type: "min_cart_total" | "product_in_cart";
  minTotal?: number | null;
  productId?: string | null;
}

interface Reward {
  id?: string;
  type: "free_shipping" | "cart_discount" | "product_discount";
  discountPct?: number | null;
  productId?: string | null;
}

interface Promotion {
  id: string;
  name: string;
  active: boolean;
  conditions: Condition[];
  rewards: Reward[];
}

const CONDITION_LABELS: Record<string, string> = {
  min_cart_total: "סכום סל מינימלי",
  product_in_cart: "מוצר בסל",
};

const REWARD_LABELS: Record<string, string> = {
  free_shipping: "משלוח חינם",
  cart_discount: "הנחה כללית על הסל",
  product_discount: "הנחה על מוצר ספציפי",
};

const inputStyle = { background: "var(--cream-dark)", borderColor: "var(--border)", color: "var(--text)" };

function conditionText(c: Condition, products: Product[]) {
  if (c.type === "min_cart_total") return `סל מעל ₪${c.minTotal}`;
  if (c.type === "product_in_cart") {
    const p = products.find((x) => x.id === c.productId);
    return `מוצר בסל: ${p?.nameHe ?? c.productId}`;
  }
  return c.type;
}

function rewardText(r: Reward, products: Product[]) {
  if (r.type === "free_shipping") return "משלוח חינם";
  if (r.type === "cart_discount") return `${r.discountPct}% הנחה על כל הסל`;
  if (r.type === "product_discount") {
    const p = products.find((x) => x.id === r.productId);
    const pct = r.discountPct === 100 ? "חינם" : `${r.discountPct}% הנחה`;
    return `${pct} על ${p?.nameHe ?? r.productId}`;
  }
  return r.type;
}

function emptyCondition(): Condition { return { type: "min_cart_total", minTotal: 300, productId: null }; }
function emptyReward(): Reward { return { type: "free_shipping", discountPct: null, productId: null }; }

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [conditions, setConditions] = useState<Condition[]>([emptyCondition()]);
  const [rewards, setRewards] = useState<Reward[]>([emptyReward()]);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  useEffect(() => {
    load();
    fetch("/api/admin/products-list").then((r) => r.json()).then(setProducts).catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/promotions");
    setPromotions(await res.json());
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setName("");
    setActive(true);
    setConditions([emptyCondition()]);
    setRewards([emptyReward()]);
    setModalOpen(true);
  }

  function openEdit(p: Promotion) {
    setEditing(p);
    setName(p.name);
    setActive(p.active);
    setConditions(p.conditions.length ? p.conditions : [emptyCondition()]);
    setRewards(p.rewards.length ? p.rewards : [emptyReward()]);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    const body = { name: name.trim(), active, conditions, rewards };
    if (editing) {
      await fetch("/api/admin/promotions", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editing.id, ...body }) });
    } else {
      await fetch("/api/admin/promotions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setSaving(false);
    setModalOpen(false);
    load();
  }

  async function doDelete(id: string) {
    setPendingDelete(null);
    await fetch("/api/admin/promotions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }

  async function toggleActive(p: Promotion) {
    await fetch("/api/admin/promotions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, name: p.name, active: !p.active, conditions: p.conditions, rewards: p.rewards }),
    });
    load();
  }

  // Condition helpers
  function setCondition(i: number, patch: Partial<Condition>) {
    setConditions((prev) => prev.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  }
  function removeCondition(i: number) { setConditions((prev) => prev.filter((_, idx) => idx !== i)); }

  // Reward helpers
  function setReward(i: number, patch: Partial<Reward>) {
    setRewards((prev) => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  }
  function removeReward(i: number) { setRewards((prev) => prev.filter((_, idx) => idx !== i)); }

  return (
    <>
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={openCreate}
          className="px-5 py-2.5 rounded-xl font-bold text-sm transition-opacity hover:opacity-80"
          style={{ background: "var(--text)", color: "var(--cream)" }}
        >
          + מבצע חדש
        </button>
        <h1 className="text-2xl font-extrabold" style={{ color: "var(--text)" }}>ניהול מבצעים</h1>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl overflow-hidden flex flex-col" style={{ background: "var(--cream)", maxHeight: "90vh" }}>
            <div className="p-6 overflow-y-auto flex-1">
              <h2 className="font-extrabold text-lg text-right mb-4" style={{ color: "var(--text)" }}>
                {editing ? "עריכת מבצע" : "מבצע חדש"}
              </h2>

              {/* Name */}
              <div className="mb-5">
                <label className="text-sm text-right block mb-1" style={{ color: "var(--text-muted)" }}>שם המבצע</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="משלוח חינם מעל ₪300"
                  className="w-full px-4 py-3 rounded-xl border text-right outline-none"
                  style={inputStyle}
                />
              </div>

              {/* Active */}
              <label className="flex items-center justify-end gap-3 cursor-pointer mb-6">
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>{active ? "פעיל" : "מושבת"}</span>
                <div
                  className="relative w-12 h-6 rounded-full transition-colors cursor-pointer"
                  style={{ background: active ? "var(--green)" : "var(--border)" }}
                  onClick={() => setActive((v) => !v)}
                >
                  <div className="absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow"
                    style={{ transform: active ? "translateX(-28px)" : "translateX(-4px)" }} />
                </div>
              </label>

              {/* Conditions */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={() => setConditions((prev) => [...prev, emptyCondition()])}
                    className="text-xs px-3 py-1.5 rounded-lg font-bold"
                    style={{ background: "var(--text)", color: "var(--cream)" }}
                  >+ הוסף תנאי</button>
                  <p className="text-sm font-bold text-right" style={{ color: "var(--text)" }}>תנאים (כל התנאים חייבים להתקיים)</p>
                </div>
                <div className="flex flex-col gap-2">
                  {conditions.map((c, i) => (
                    <div key={i} className="flex flex-col gap-2 p-3 rounded-xl border" style={{ borderColor: "var(--border)" }}>
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => removeCondition(i)} className="text-xs" style={{ color: "var(--maroon)" }} aria-label="הסר תנאי"><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                        <select
                          value={c.type}
                          onChange={(e) => setCondition(i, { type: e.target.value as Condition["type"], minTotal: null, productId: null })}
                          className="flex-1 px-3 py-2 rounded-xl border text-right outline-none text-sm"
                          style={inputStyle}
                        >
                          {Object.entries(CONDITION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </div>
                      {c.type === "min_cart_total" && (
                        <input
                          type="number"
                          value={c.minTotal ?? ""}
                          onChange={(e) => setCondition(i, { minTotal: Number(e.target.value) })}
                          placeholder="סכום מינימלי (₪)"
                          className="w-full px-3 py-2 rounded-xl border text-right outline-none text-sm"
                          style={inputStyle}
                        />
                      )}
                      {c.type === "product_in_cart" && (
                        <select
                          value={c.productId ?? ""}
                          onChange={(e) => setCondition(i, { productId: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border text-right outline-none text-sm"
                          style={inputStyle}
                        >
                          <option value="">בחר מוצר...</option>
                          {products.map((p) => <option key={p.id} value={p.id}>{p.nameHe}</option>)}
                        </select>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Rewards */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={() => setRewards((prev) => [...prev, emptyReward()])}
                    className="text-xs px-3 py-1.5 rounded-lg font-bold"
                    style={{ background: "var(--text)", color: "var(--cream)" }}
                  >+ הוסף פרס</button>
                  <p className="text-sm font-bold text-right" style={{ color: "var(--text)" }}>פרסים (כולם יחולו)</p>
                </div>
                <div className="flex flex-col gap-2">
                  {rewards.map((r, i) => (
                    <div key={i} className="flex flex-col gap-2 p-3 rounded-xl border" style={{ borderColor: "var(--border)" }}>
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => removeReward(i)} className="text-xs" style={{ color: "var(--maroon)" }} aria-label="הסר פרס"><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                        <select
                          value={r.type}
                          onChange={(e) => setReward(i, { type: e.target.value as Reward["type"], discountPct: null, productId: null })}
                          className="flex-1 px-3 py-2 rounded-xl border text-right outline-none text-sm"
                          style={inputStyle}
                        >
                          {Object.entries(REWARD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </div>
                      {r.type === "cart_discount" && (
                        <input
                          type="number"
                          min={1} max={100}
                          value={r.discountPct ?? ""}
                          onChange={(e) => setReward(i, { discountPct: Number(e.target.value) })}
                          placeholder="אחוז הנחה (1–100)"
                          className="w-full px-3 py-2 rounded-xl border text-right outline-none text-sm"
                          style={inputStyle}
                        />
                      )}
                      {r.type === "product_discount" && (
                        <>
                          <select
                            value={r.productId ?? ""}
                            onChange={(e) => setReward(i, { productId: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border text-right outline-none text-sm"
                            style={inputStyle}
                          >
                            <option value="">בחר מוצר...</option>
                            {products.map((p) => <option key={p.id} value={p.id}>{p.nameHe} – ₪{p.price}</option>)}
                          </select>
                          <div className="flex gap-2 flex-wrap">
                            {[10, 15, 20, 25, 50, 75, 100].map((pct) => (
                              <button
                                key={pct}
                                type="button"
                                onClick={() => setReward(i, { discountPct: pct })}
                                className="px-3 py-1 rounded-lg text-xs font-bold border transition-all"
                                style={{
                                  borderColor: r.discountPct === pct ? "var(--text)" : "var(--border)",
                                  background: r.discountPct === pct ? "var(--text)" : "transparent",
                                  color: r.discountPct === pct ? "var(--cream)" : "var(--text-muted)",
                                }}
                              >
                                {pct === 100 ? "חינם" : `${pct}%`}
                              </button>
                            ))}
                          </div>
                          <input
                            type="number"
                            min={1} max={100}
                            value={r.discountPct ?? ""}
                            onChange={(e) => setReward(i, { discountPct: Number(e.target.value) })}
                            placeholder="אחוז הנחה (100 = חינם)"
                            className="w-full px-3 py-2 rounded-xl border text-right outline-none text-sm"
                            style={inputStyle}
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t" style={{ borderColor: "var(--border)" }}>
              <button onClick={() => setModalOpen(false)} className="flex-1 py-3 rounded-xl border font-medium" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>ביטול</button>
              <button onClick={handleSave} disabled={saving || !name.trim()} className="flex-1 py-3 rounded-xl font-bold disabled:opacity-50" style={{ background: "var(--text)", color: "var(--cream)" }}>
                {saving ? "שומר..." : "שמור מבצע"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Promotions list */}
      {loading ? (
        <p className="text-center py-20" style={{ color: "var(--text-muted)" }}>טוען...</p>
      ) : promotions.length === 0 ? (
        <div className="rounded-2xl border p-16 text-center" style={{ borderColor: "var(--border)" }}>
          <p style={{ color: "var(--text-muted)" }}>אין מבצעים עדיין</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {promotions.map((p) => (
            <div key={p.id} className="rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: p.active ? "var(--cream)" : "var(--cream-dark)", opacity: p.active ? 1 : 0.7 }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex gap-2">
                  <button onClick={() => setPendingDelete(p.id)} className="text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: "#f5e8e8", color: "var(--maroon)" }}>מחק</button>
                  <button onClick={() => openEdit(p)} className="text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: "var(--border)", color: "var(--text)" }}>עריכה</button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: p.active ? "#e8f5e9" : "#f0f0f0", color: p.active ? "var(--green)" : "#888" }}>
                    {p.active ? "פעיל" : "מושבת"}
                  </span>
                  <div
                    className="relative w-10 h-5 rounded-full transition-colors cursor-pointer"
                    style={{ background: p.active ? "var(--green)" : "var(--border)" }}
                    onClick={() => toggleActive(p)}
                  >
                    <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow"
                      style={{ transform: p.active ? "translateX(-22px)" : "translateX(-2px)" }} />
                  </div>
                  <h3 className="font-bold text-right" style={{ color: "var(--text)" }}>{p.name}</h3>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl p-3" style={{ background: "var(--cream-dark)" }}>
                  <p className="font-bold mb-1.5 text-right text-xs" style={{ color: "var(--text-muted)" }}>תנאים</p>
                  {p.conditions.length === 0
                    ? <p className="text-right text-xs" style={{ color: "var(--text-muted)" }}>ללא תנאים</p>
                    : p.conditions.map((c, i) => (
                        <p key={i} className="text-right text-xs mb-0.5" style={{ color: "var(--text)" }}>• {conditionText(c, products)}</p>
                      ))
                  }
                </div>
                <div className="rounded-xl p-3" style={{ background: "var(--cream-dark)" }}>
                  <p className="font-bold mb-1.5 text-right text-xs" style={{ color: "var(--text-muted)" }}>פרסים</p>
                  {p.rewards.length === 0
                    ? <p className="text-right text-xs" style={{ color: "var(--text-muted)" }}>ללא פרסים</p>
                    : p.rewards.map((r, i) => (
                        <p key={i} className="text-right text-xs mb-0.5 flex items-center gap-1 justify-end" style={{ color: "var(--green)" }}><svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>{rewardText(r, products)}</p>
                      ))
                  }
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    {pendingDelete && (
      <ConfirmModal
        message="למחוק מבצע זה?"
        confirmLabel="מחק"
        onConfirm={() => doDelete(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
      />
    )}
    </>
  );
}
