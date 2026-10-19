"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

export interface PickerProduct { id: string; nameHe: string; image: string; active: boolean }

const inputStyle = { background: "var(--cream-dark)", borderColor: "var(--border)", color: "var(--text)" };

/**
 * Every product in the store with a checkbox, for choosing which ones belong
 * to a category — instead of opening each product to tick its categories.
 */
export default function CategoryProductPicker({
  title,
  initialSelected,
  saveLabel = "שמור",
  onSave,
  onCancel,
}: {
  title: string;
  initialSelected: string[];
  saveLabel?: string;
  onSave: (productIds: string[]) => Promise<void> | void;
  onCancel: () => void;
}) {
  const [products, setProducts] = useState<PickerProduct[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialSelected));
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/products-list")
      .then((r) => r.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setError("טעינת המוצרים נכשלה"));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (products ?? []).filter((p) => !q || p.nameHe.toLowerCase().includes(q));
  }, [products, query]);

  const allVisibleSelected = visible.length > 0 && visible.every((p) => selected.has(p.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      visible.forEach((p) => (allVisibleSelected ? next.delete(p.id) : next.add(p.id)));
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      // Keep the store's own order (A–Z) for products added together
      await onSave((products ?? []).filter((p) => selected.has(p.id)).map((p) => p.id));
    } catch {
      setError("השמירה נכשלה, נסה שוב");
      setSaving(false);
    }
  }

  return (
    // No close on a backdrop tap: a stray tap would throw away every tick
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-picker-title"
        // A fixed height, so the window does not jump around while a search narrows the list
        className="w-full max-w-lg rounded-3xl overflow-hidden flex flex-col"
        style={{ background: "var(--cream)", height: "min(90vh, 44rem)" }}
      >
        <div className="p-5 pb-3 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 id="category-picker-title" className="font-extrabold text-lg text-right mb-3" style={{ color: "var(--text)" }}>{title}</h2>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש מוצר..."
            aria-label="חיפוש מוצר"
            className="w-full px-4 py-2.5 rounded-xl border text-right outline-none text-base sm:text-sm"
            style={inputStyle}
          />
          <div className="flex items-center justify-between mt-3">
            <button type="button" onClick={toggleAllVisible} disabled={visible.length === 0} className="text-xs font-bold underline disabled:opacity-40" style={{ color: "var(--text)" }}>
              {allVisibleSelected ? "נקה הכל" : query.trim() ? "בחר את כל התוצאות" : "בחר הכל"}
            </button>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>נבחרו {selected.size} מוצרים</span>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-3">
          {products === null ? (
            <p className="text-sm text-center py-10" style={{ color: "var(--text-muted)" }}>{error || "טוען..."}</p>
          ) : visible.length === 0 ? (
            <p className="text-sm text-center py-10" style={{ color: "var(--text-muted)" }}>{products.length === 0 ? "אין מוצרים עדיין" : "לא נמצאו מוצרים"}</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {visible.map((p) => {
                const checked = selected.has(p.id);
                return (
                  <li key={p.id}>
                    <label
                      className="flex items-center gap-3 px-3 py-2 rounded-xl border cursor-pointer transition-colors"
                      style={{ borderColor: checked ? "var(--text)" : "var(--border)", background: checked ? "var(--cream-dark)" : "transparent" }}
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggle(p.id)} className="w-5 h-5 flex-shrink-0 accent-[var(--text)]" />
                      {p.image ? (
                        <div className="relative w-10 h-10 rounded-md overflow-hidden flex-shrink-0 border" style={{ borderColor: "var(--border)" }}>
                          <Image src={p.image} alt="" fill className="object-cover" sizes="40px" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-md flex-shrink-0" style={{ background: "var(--cream-dark)" }} />
                      )}
                      <span dir="auto" className="text-sm flex-1 text-start truncate" style={{ color: "var(--text)", opacity: p.active ? 1 : 0.55 }}>
                        {p.nameHe}
                      </span>
                      {!p.active && <span className="text-[10px] flex-shrink-0" style={{ color: "var(--text-muted)" }}>לא פעיל</span>}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="p-5 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
          {error && products !== null && <p role="alert" className="text-xs text-right mb-2 font-medium" style={{ color: "var(--maroon)" }}>{error}</p>}
          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 py-3 rounded-xl border font-medium" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>ביטול</button>
            <button onClick={save} disabled={saving || products === null} className="flex-1 py-3 rounded-xl font-bold disabled:opacity-50" style={{ background: "var(--text)", color: "var(--cream)" }}>
              {saving ? "שומר..." : saveLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
