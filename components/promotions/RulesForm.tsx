"use client";
import type { Condition, ConditionLogic, PatchDraft, Product, PromotionDraft, Reward } from "./types";
import { emptyCondition, emptyReward } from "./types";
import { Choice } from "./controls";
import type { FreeShippingScope } from "@/lib/shippingScope";

const SHIPPING_SCOPES: { value: FreeShippingScope; label: string }[] = [
  { value: "all", label: "בית + נקודת איסוף" },
  { value: "home", label: "עד הבית" },
  { value: "epost", label: "נקודת איסוף" },
];

const CONDITION_LABELS: Record<string, string> = {
  min_cart_total: "סכום סל מינימלי",
  product_in_cart: "מוצר בסל",
};

const REWARD_LABELS: Record<string, string> = {
  free_shipping: "משלוח חינם",
  cart_discount: "הנחה כללית על הסל",
  product_discount: "הנחה על מוצר ספציפי",
};

const LOGIC_OPTIONS: { value: ConditionLogic; label: string; hint: string }[] = [
  { value: "all", label: "כל התנאים (וגם)", hint: "המבצע יחול רק אם כל התנאים מתקיימים" },
  { value: "any", label: "לפחות תנאי אחד (או)", hint: "מספיק שתנאי אחד יתקיים כדי שהמבצע יחול" },
];

const inputStyle = { background: "var(--cream-dark)", borderColor: "var(--border)", color: "var(--text)" };

/** Conditions + rewards: free shipping, a cart-wide discount, or a discount on one product. */
export default function RulesForm({ draft, patch, products }: { draft: PromotionDraft; patch: PatchDraft; products: Product[] }) {
  const { conditions, rewards, conditionLogic } = draft;
  const setConditionLogic = (conditionLogic: ConditionLogic) => patch({ conditionLogic });

  function setCondition(i: number, p: Partial<Condition>) {
    patch({ conditions: conditions.map((c, idx) => idx === i ? { ...c, ...p } : c) });
  }
  function addCondition() { patch({ conditions: [...conditions, emptyCondition()] }); }
  function removeCondition(i: number) { patch({ conditions: conditions.filter((_, idx) => idx !== i) }); }

  function setReward(i: number, p: Partial<Reward>) {
    patch({ rewards: rewards.map((r, idx) => idx === i ? { ...r, ...p } : r) });
  }
  function addReward() { patch({ rewards: [...rewards, emptyReward()] }); }
  function removeReward(i: number) { patch({ rewards: rewards.filter((_, idx) => idx !== i) }); }

  return (
    <>
      {/* Conditions */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={addCondition}
            className="text-xs px-3 py-1.5 min-h-8 rounded-lg font-bold"
            style={{ background: "var(--text)", color: "var(--cream)" }}
          >+ הוסף תנאי</button>
          <p className="text-sm font-bold text-right" style={{ color: "var(--text)" }}>תנאים</p>
        </div>

        {/* AND / OR — lets one promotion replace several near-identical ones */}
        <div className="flex gap-2 mb-2">
          {LOGIC_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setConditionLogic(opt.value)}
              className="flex-1 px-3 py-2 rounded-xl text-xs font-bold border transition-all"
              style={{
                borderColor: conditionLogic === opt.value ? "var(--text)" : "var(--border)",
                background: conditionLogic === opt.value ? "var(--text)" : "transparent",
                color: conditionLogic === opt.value ? "var(--cream)" : "var(--text-muted)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-right mb-2" style={{ color: "var(--text-muted)" }}>
          {LOGIC_OPTIONS.find((o) => o.value === conditionLogic)?.hint}
        </p>

        <div className="flex flex-col gap-2">
          {conditions.map((c, i) => (
            <div key={i} className="flex flex-col gap-2 p-3 rounded-xl border" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2 justify-end">
                <button onClick={() => removeCondition(i)} className="text-xs p-2 -m-2" style={{ color: "var(--maroon)" }} aria-label="הסר תנאי"><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                <select
                  value={c.type}
                  onChange={(e) => setCondition(i, { type: e.target.value as Condition["type"], minTotal: null, productId: null })}
                  className="flex-1 px-3 py-2 rounded-xl border text-right outline-none text-base sm:text-sm"
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
                  className="w-full px-3 py-2 rounded-xl border text-right outline-none text-base sm:text-sm"
                  style={inputStyle}
                />
              )}
              {c.type === "product_in_cart" && (
                <select
                  value={c.productId ?? ""}
                  onChange={(e) => setCondition(i, { productId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border text-right outline-none text-base sm:text-sm"
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
            onClick={addReward}
            className="text-xs px-3 py-1.5 min-h-8 rounded-lg font-bold"
            style={{ background: "var(--text)", color: "var(--cream)" }}
          >+ הוסף פרס</button>
          <p className="text-sm font-bold text-right" style={{ color: "var(--text)" }}>פרסים (כולם יחולו)</p>
        </div>

        <div className="flex flex-col gap-2">
          {rewards.map((r, i) => (
            <div key={i} className="flex flex-col gap-2 p-3 rounded-xl border" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2 justify-end">
                <button onClick={() => removeReward(i)} className="text-xs p-2 -m-2" style={{ color: "var(--maroon)" }} aria-label="הסר פרס"><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                <select
                  value={r.type}
                  onChange={(e) => setReward(i, { type: e.target.value as Reward["type"], discountPct: null, discountAmount: null, productId: null, maxUnits: null, shippingScope: e.target.value === "free_shipping" ? "all" : null })}
                  className="flex-1 px-3 py-2 rounded-xl border text-right outline-none text-base sm:text-sm"
                  style={inputStyle}
                >
                  {Object.entries(REWARD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              {r.type === "free_shipping" && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs text-right" style={{ color: "var(--text-muted)" }}>על איזה משלוח?</p>
                  <Choice size="sm" value={r.shippingScope ?? "all"} options={SHIPPING_SCOPES} onChange={(v) => setReward(i, { shippingScope: v })} />
                  <p className="text-xs text-right" style={{ color: "var(--text-muted)" }}>איסוף עצמי ממילא חינם.</p>
                </div>
              )}
              {r.type === "cart_discount" && (
                <>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setReward(i, { discountPct: r.discountPct ?? 10, discountAmount: null })}
                      className="flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all"
                      style={{
                        borderColor: !r.discountAmount ? "var(--text)" : "var(--border)",
                        background: !r.discountAmount ? "var(--text)" : "transparent",
                        color: !r.discountAmount ? "var(--cream)" : "var(--text-muted)",
                      }}
                    >
                      הנחה באחוזים %
                    </button>
                    <button
                      type="button"
                      onClick={() => setReward(i, { discountAmount: r.discountAmount ?? 10, discountPct: null })}
                      className="flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all"
                      style={{
                        borderColor: r.discountAmount ? "var(--text)" : "var(--border)",
                        background: r.discountAmount ? "var(--text)" : "transparent",
                        color: r.discountAmount ? "var(--cream)" : "var(--text-muted)",
                      }}
                    >
                      הנחה בשקלים ₪
                    </button>
                  </div>
                  {!r.discountAmount ? (
                    <input
                      type="number"
                      min={1} max={100}
                      value={r.discountPct ?? ""}
                      onChange={(e) => setReward(i, { discountPct: Number(e.target.value) })}
                      placeholder="אחוז הנחה (1–100)"
                      className="w-full px-3 py-2 rounded-xl border text-right outline-none text-base sm:text-sm"
                      style={inputStyle}
                    />
                  ) : (
                    <input
                      type="number"
                      min={1}
                      value={r.discountAmount ?? ""}
                      onChange={(e) => setReward(i, { discountAmount: Number(e.target.value) })}
                      placeholder="סכום הנחה בשקלים (₪)"
                      className="w-full px-3 py-2 rounded-xl border text-right outline-none text-base sm:text-sm"
                      style={inputStyle}
                    />
                  )}
                </>
              )}
              {r.type === "product_discount" && (
                <>
                  <select
                    value={r.productId ?? ""}
                    onChange={(e) => setReward(i, { productId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-right outline-none text-base sm:text-sm"
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
                    className="w-full px-3 py-2 rounded-xl border text-right outline-none text-base sm:text-sm"
                    style={inputStyle}
                  />

                  {/* How many units of the product the discount reaches */}
                  <p className="text-xs text-right font-medium" style={{ color: "var(--text-muted)" }}>
                    על כמה פריטים ההנחה חלה?
                  </p>
                  <div className="flex gap-2">
                    {([
                      { limited: false, label: "כל הפריטים בסל" },
                      { limited: true,  label: "כמות מוגבלת" },
                    ]).map(({ limited, label }) => {
                      const selected = limited ? r.maxUnits != null : r.maxUnits == null;
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setReward(i, { maxUnits: limited ? (r.maxUnits ?? 1) : null })}
                          className="flex-1 px-3 py-2 rounded-xl text-xs font-bold border transition-all"
                          style={{
                            borderColor: selected ? "var(--text)" : "var(--border)",
                            background: selected ? "var(--text)" : "transparent",
                            color: selected ? "var(--cream)" : "var(--text-muted)",
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  {r.maxUnits != null && (
                    <input
                      type="number"
                      min={1}
                      value={r.maxUnits}
                      onChange={(e) => setReward(i, { maxUnits: Math.max(1, Number(e.target.value) || 1) })}
                      placeholder="כמה פריטים מקבלים את ההנחה"
                      className="w-full px-3 py-2 rounded-xl border text-right outline-none text-base sm:text-sm"
                      style={inputStyle}
                    />
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
