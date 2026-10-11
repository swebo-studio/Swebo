"use client";
import { useState } from "react";
import type { Category, ListItem, Product } from "./types";
import { inputClass, inputStyle } from "./controls";

/**
 * Picks the products one side of a bundle / buy_get applies to: whole
 * categories (which keep covering products added to them later), single
 * products, or both.
 */
export default function ItemPicker({
  role,
  items,
  onChange,
  products,
  categories,
}: {
  role: ListItem["role"];
  /** every list entry of the promotion; only `role`'s are shown and changed */
  items: ListItem[];
  onChange: (items: ListItem[]) => void;
  products: Product[];
  categories: Category[];
}) {
  const [query, setQuery] = useState("");
  const mine = items.filter((i) => i.role === role);
  // A whole collection is the common case, so the long product list stays
  // folded away unless it is already in use or there is nothing else to pick.
  const [showProducts, setShowProducts] = useState(() => categories.length === 0 || mine.some((i) => i.productId));
  const others = items.filter((i) => i.role !== role);
  const categoryIds = new Set(mine.map((i) => i.categoryId).filter(Boolean));
  const productIds = new Set(mine.map((i) => i.productId).filter(Boolean));

  const set = (next: ListItem[]) => onChange([...others, ...next]);
  const toggleCategory = (id: string) =>
    set(categoryIds.has(id) ? mine.filter((i) => i.categoryId !== id) : [...mine, { role, categoryId: id }]);
  const toggleProduct = (id: string) =>
    set(productIds.has(id) ? mine.filter((i) => i.productId !== id) : [...mine, { role, productId: id }]);

  const q = query.trim();
  const visible = q ? products.filter((p) => p.nameHe.includes(q)) : products;
  const chosen = products.filter((p) => productIds.has(p.id));

  return (
    <div className="flex flex-col gap-3 p-3 rounded-xl border" style={{ borderColor: "var(--border)" }}>
      {categories.length > 0 && (
        <div>
          <p className="text-xs font-bold text-right mb-1.5" style={{ color: "var(--text-muted)" }}>קטגוריות שלמות</p>
          <div className="flex gap-2 flex-wrap">
            {categories.map((c) => {
              const on = categoryIds.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleCategory(c.id)}
                  className="px-3 py-1 min-h-8 rounded-full text-xs font-bold border transition-all"
                  style={{
                    borderColor: on ? "var(--text)" : "var(--border)",
                    background: on ? "var(--text)" : "transparent",
                    color: on ? "var(--cream)" : "var(--text-muted)",
                  }}
                >
                  {c.nameHe}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-bold text-right" style={{ color: "var(--text-muted)" }}>
            מוצרים בודדים {chosen.length > 0 && `· נבחרו ${chosen.length}`}
          </p>
          {categories.length > 0 && (
            <button
              type="button"
              aria-expanded={showProducts}
              onClick={() => setShowProducts((v) => !v)}
              className="text-xs font-bold underline underline-offset-2 py-2 -my-2"
              style={{ color: "var(--text)" }}
            >
              {showProducts ? "סגירה" : "בחירת מוצרים בודדים"}
            </button>
          )}
        </div>
        {chosen.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-2">
            {chosen.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => toggleProduct(p.id)}
                aria-label={`הסר ${p.nameHe}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 min-h-8 rounded-full text-xs"
                style={{ background: "var(--cream-dark)", color: "var(--text)" }}
              >
                {p.nameHe}
                <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" viewBox="0 0 24 24" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            ))}
          </div>
        )}
        {showProducts && (
          <>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חיפוש מוצר..."
              aria-label="חיפוש מוצר"
              className={inputClass}
              style={inputStyle}
            />
            <ul className="mt-2 max-h-44 overflow-y-auto rounded-xl border" style={{ borderColor: "var(--border)" }}>
              {visible.length === 0 && (
                <li className="px-3 py-2 text-xs text-right" style={{ color: "var(--text-muted)" }}>לא נמצאו מוצרים</li>
              )}
              {visible.map((p) => (
                <li key={p.id}>
                  <label className="flex items-center gap-2 px-3 py-2 sm:py-1.5 text-sm cursor-pointer hover:opacity-80" style={{ color: "var(--text)" }}>
                    <input type="checkbox" checked={productIds.has(p.id)} onChange={() => toggleProduct(p.id)} />
                    <span className="flex-1 text-right truncate">{p.nameHe}</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>₪{p.price}</span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
