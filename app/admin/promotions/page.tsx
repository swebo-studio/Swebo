"use client";
import { useState, useEffect } from "react";
import ConfirmModal from "@/components/ConfirmModal";
import type { Category, Product, Promotion, PromotionDraft, PromotionKind } from "@/components/promotions/types";
import { draftFor, draftProblem, emptyCondition, emptyReward } from "@/components/promotions/types";
import { Switch, inputStyle } from "@/components/promotions/controls";
import RulesForm from "@/components/promotions/RulesForm";
import BundleForm from "@/components/promotions/BundleForm";
import BuyGetForm from "@/components/promotions/BuyGetForm";
import PromotionSummary from "@/components/promotions/PromotionSummary";

const KINDS: { kind: PromotionKind; label: string; hint: string; placeholder: string }[] = [
  { kind: "rules", label: "הנחה / משלוח", hint: "משלוח חינם, הנחה על הסל או על מוצר", placeholder: "משלוח חינם מעל ₪300" },
  { kind: "bundle", label: "חבילה במחיר", hint: "למשל 3 פריטים ב-₪200", placeholder: "3 פריטים ב-₪200" },
  { kind: "buy_get", label: "קנה וקבל", hint: "קונים מרשימה אחת, מקבלים מאחרת", placeholder: "קונים מהחורף, מקבלים מהקיץ" },
];
const kindInfo = (kind: PromotionKind) => KINDS.find((k) => k.kind === kind) ?? KINDS[0];

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [draft, setDraft] = useState<PromotionDraft>(() => draftFor("rules"));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const patch = (p: Partial<PromotionDraft>) => setDraft((d) => ({ ...d, ...p }));

  useEffect(() => {
    load();
    fetch("/api/admin/products-list").then((r) => r.json()).then(setProducts).catch(() => {});
    fetch("/api/admin/categories").then((r) => r.json()).then(setCategories).catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/promotions");
    setPromotions(await res.json());
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setDraft(draftFor("rules"));
    setSaveError(null);
    setModalOpen(true);
  }

  function openEdit(p: Promotion) {
    setEditing(p);
    setDraft({
      ...p,
      kind: p.kind ?? "rules",
      conditionLogic: p.conditionLogic ?? "all",
      exclusive: p.exclusive ?? true,
      conditions: p.conditions.length || p.kind !== "rules" ? p.conditions : [emptyCondition()],
      rewards: p.rewards.length || p.kind !== "rules" ? p.rewards : [emptyReward()],
      items: p.items ?? [],
    });
    setSaveError(null);
    setModalOpen(true);
  }

  /** Only offered while creating: an existing promotion keeps its kind. */
  function switchKind(kind: PromotionKind) {
    if (kind === draft.kind) return;
    setDraft((d) => draftFor(kind, { name: d.name, active: d.active, exclusive: d.exclusive }));
    setSaveError(null);
  }

  const problem = draftProblem(draft);

  async function handleSave() {
    if (problem) return;
    setSaving(true);
    setSaveError(null);
    const body = { ...draft, name: draft.name.trim(), ...(editing ? { id: editing.id } : {}) };
    const res = await fetch("/api/admin/promotions", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setSaveError(data.error ?? "השמירה נכשלה");
      return;
    }
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
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, active: !p.active }),
    });
    load();
  }

  const formProps = { draft, patch, products, categories };

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
          <div role="dialog" aria-modal="true" aria-labelledby="promotion-modal-title" className="w-full max-w-lg rounded-3xl overflow-hidden flex flex-col" style={{ background: "var(--cream)", maxHeight: "90vh" }}>
            <div className="p-6 overflow-y-auto flex-1">
              <h2 id="promotion-modal-title" className="font-extrabold text-lg text-right mb-4" style={{ color: "var(--text)" }}>
                {editing ? `עריכת מבצע · ${kindInfo(draft.kind).label}` : "מבצע חדש"}
              </h2>

              {/* One tab per kind of promotion — each has its own, short form */}
              {!editing && (
                <>
                  <div role="tablist" aria-label="סוג המבצע" className="grid grid-cols-3 gap-1 p-1 mb-2 sm:mb-5 rounded-2xl" style={{ background: "var(--cream-dark)" }}>
                    {KINDS.map(({ kind, label, hint }) => {
                      const selected = draft.kind === kind;
                      return (
                        <button
                          key={kind}
                          type="button"
                          role="tab"
                          aria-selected={selected}
                          onClick={() => switchKind(kind)}
                          className="px-2 py-2 rounded-xl text-center transition-all"
                          style={{
                            background: selected ? "var(--cream)" : "transparent",
                            boxShadow: selected ? "0 1px 3px rgba(0,0,0,0.12)" : undefined,
                          }}
                        >
                          <span className="block text-sm font-bold whitespace-nowrap" style={{ color: selected ? "var(--text)" : "var(--text-muted)" }}>{label}</span>
                          {/* The hints only fit from sm up; on a phone they would triple the tabs' height */}
                          <span className="hidden sm:block text-[11px] leading-tight mt-0.5" style={{ color: "var(--text-muted)" }}>{hint}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="sm:hidden text-xs text-right mb-5" style={{ color: "var(--text-muted)" }}>{kindInfo(draft.kind).hint}</p>
                </>
              )}

              {/* Name */}
              <div className="mb-5">
                <label htmlFor="promotion-name" className="text-sm text-right block mb-1" style={{ color: "var(--text-muted)" }}>שם המבצע</label>
                <input
                  id="promotion-name"
                  type="text"
                  value={draft.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  placeholder={kindInfo(draft.kind).placeholder}
                  className="w-full px-4 py-3 rounded-xl border text-right outline-none"
                  style={inputStyle}
                />
                {draft.kind !== "rules" && (
                  <p className="text-xs text-right mt-1" style={{ color: "var(--text-muted)" }}>השם מוצג ללקוחות בעגלה</p>
                )}
              </div>

              {/* Active */}
              <div className="flex items-center justify-end gap-3 mb-6">
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>{draft.active ? "פעיל" : "מושבת"}</span>
                <Switch on={draft.active} onToggle={() => patch({ active: !draft.active })} label="מבצע פעיל" />
              </div>

              <div role="tabpanel" aria-label={kindInfo(draft.kind).label}>
                {draft.kind === "rules" && <RulesForm {...formProps} />}
                {draft.kind === "bundle" && <BundleForm {...formProps} />}
                {draft.kind === "buy_get" && <BuyGetForm {...formProps} />}
              </div>

              {/* Exclusivity — the guard against several offers gutting one item */}
              <div className="p-3 rounded-xl border" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center justify-end gap-3">
                  <span className="text-xs font-bold" style={{ color: "var(--text)" }}>
                    {draft.exclusive ? "לא משתלב עם מבצעים אחרים" : "ניתן לשילוב עם מבצעים אחרים"}
                  </span>
                  <Switch on={draft.exclusive} onToggle={() => patch({ exclusive: !draft.exclusive })} label="לא משתלב עם מבצעים אחרים" />
                </div>
                <p className="text-xs text-right mt-1.5" style={{ color: "var(--text-muted)" }}>
                  {draft.exclusive
                    ? "מבצע אחר לא יוכל להוסיף הנחה על מוצר שהמבצע הזה כבר מוזיל."
                    : "מבצע אחר יוכל להוזיל פריטים נוספים של אותו מוצר. הנחות לעולם לא מצטברות על אותו פריט — תמיד חלה ההנחה הגבוהה ביותר."}
                </p>
              </div>
            </div>

            <div className="p-6 border-t" style={{ borderColor: "var(--border)" }}>
              {(saveError || (problem && draft.name.trim())) && (
                <p role="alert" className="text-xs text-right mb-3 font-medium" style={{ color: "var(--maroon)" }}>
                  {saveError ?? problem}
                </p>
              )}
              <div className="flex gap-3">
                <button onClick={() => setModalOpen(false)} className="flex-1 py-3 rounded-xl border font-medium" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>ביטול</button>
                <button onClick={handleSave} disabled={saving || !!problem} className="flex-1 py-3 rounded-xl font-bold disabled:opacity-50" style={{ background: "var(--text)", color: "var(--cream)" }}>
                  {saving ? "שומר..." : "שמור מבצע"}
                </button>
              </div>
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
              <div className="flex flex-wrap-reverse items-center justify-between gap-3 mb-3">
                <div className="flex gap-2">
                  <button onClick={() => setPendingDelete(p.id)} className="text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: "#f5e8e8", color: "var(--maroon)" }}>מחק</button>
                  <button onClick={() => openEdit(p)} className="text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: "var(--border)", color: "var(--text)" }}>עריכה</button>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
                  {!p.exclusive && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "#fff4e5", color: "var(--maroon)" }}>
                      משתלב
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "var(--cream-dark)", color: "var(--text-muted)" }}>
                    {kindInfo(p.kind).label}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: p.active ? "#e8f5e9" : "#f0f0f0", color: p.active ? "var(--green)" : "#888" }}>
                    {p.active ? "פעיל" : "מושבת"}
                  </span>
                  <Switch small on={p.active} onToggle={() => toggleActive(p)} label={`${p.name} פעיל`} />
                  <h3 className="font-bold text-right" style={{ color: "var(--text)" }}>{p.name}</h3>
                </div>
              </div>

              <PromotionSummary p={p} products={products} categories={categories} />
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
