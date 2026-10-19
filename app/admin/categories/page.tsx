"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import ConfirmModal from "@/components/ConfirmModal";
import DragList, { DragHandle } from "@/components/DragList";
import CategoryProductPicker from "@/components/CategoryProductPicker";

interface Category { id: string; nameHe: string; sortOrder: number }
interface CategoryProduct { id: string; nameHe: string; image: string; active: boolean }

const inputStyle = { background: "var(--cream-dark)", borderColor: "var(--border)", color: "var(--text)" };

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [confirmState, setConfirmState] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [products, setProducts] = useState<Record<string, CategoryProduct[]>>({});
  const [loadingProducts, setLoadingProducts] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  /** The product picker: for a category about to be created, or for an existing one */
  const [picker, setPicker] = useState<{ name: string; categoryId?: string } | null>(null);

  useEffect(() => { fetchCategories(); }, []);

  function fetchCategories() {
    fetch("/api/admin/categories").then((r) => r.json()).then(setCategories).catch(() => {});
  }

  /** A new category starts by choosing its products; nothing is created until that is saved. */
  function addCategory() {
    if (!newCatName.trim()) return;
    setPicker({ name: newCatName.trim() });
  }

  async function createCategory(productIds: string[]) {
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nameHe: picker!.name, productIds, sortOrder: categories.reduce((max, c) => Math.max(max, c.sortOrder), -1) + 1 }),
    });
    if (!res.ok) throw new Error();
    setNewCatName("");
    setPicker(null);
    fetchCategories();
  }

  async function loadProducts(catId: string) {
    const res = await fetch(`/api/admin/categories/${catId}/products`);
    const data = await res.json();
    setProducts((prev) => ({ ...prev, [catId]: Array.isArray(data) ? data : [] }));
  }

  async function setCategoryProducts(catId: string, productIds: string[]) {
    const res = await fetch(`/api/admin/categories/${catId}/products`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds }),
    });
    if (!res.ok) throw new Error();
    setPicker(null);
    await loadProducts(catId);
  }

  async function deleteCategory(id: string) {
    setConfirmState({ message: "למחוק קטגוריה זו? המוצרים שלה יישארו ללא קטגוריה.", onConfirm: async () => {
      setConfirmState(null);
      await fetch("/api/admin/categories", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (expandedId === id) setExpandedId(null);
      fetchCategories();
    }});
  }

  async function saveRename() {
    if (!editing) return;
    const name = editing.name.trim();
    const current = categories.find((c) => c.id === editing.id);
    if (!name || name === current?.nameHe) { setEditing(null); return; }
    const previous = categories;
    setCategories((cats) => cats.map((c) => (c.id === editing.id ? { ...c, nameHe: name } : c)));
    setEditing(null);
    setError("");
    try {
      const res = await fetch("/api/admin/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing.id, nameHe: name }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setCategories(previous);
      setError("שינוי שם הקטגוריה נכשל, נסה שוב");
    }
  }

  // Always writes the whole list back as 0..n-1. Swapping two sortOrder values
  // silently did nothing whenever a pair of categories shared the same value.
  async function reorderCategories(next: Category[]) {
    const previous = categories;
    const reindexed = next.map((c, i) => ({ ...c, sortOrder: i }));
    setCategories(reindexed);
    setError("");
    try {
      const res = await fetch("/api/admin/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reindexed.map(({ id, sortOrder }) => ({ id, sortOrder }))),
      });
      if (!res.ok) throw new Error();
    } catch {
      setCategories(previous);
      setError("שמירת סדר הקטגוריות נכשלה, נסה שוב");
    }
  }

  async function toggleExpand(catId: string) {
    if (expandedId === catId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(catId);
    if (!products[catId]) {
      setLoadingProducts(catId);
      await loadProducts(catId);
      setLoadingProducts(null);
    }
  }

  async function reorderProducts(catId: string, next: CategoryProduct[]) {
    const previous = products[catId];
    setProducts((prev) => ({ ...prev, [catId]: next }));
    setError("");
    try {
      const res = await fetch(`/api/admin/categories/${catId}/products`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next.map((p, i) => ({ productId: p.id, sortOrder: i }))),
      });
      if (!res.ok) throw new Error();
    } catch {
      setProducts((prev) => ({ ...prev, [catId]: previous }));
      setError("שמירת סדר המוצרים נכשלה, נסה שוב");
    }
  }

  return (
    <>
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-extrabold mb-2 text-right" style={{ color: "var(--text)" }}>ניהול קטגוריות</h1>
      <p className="text-sm mb-6 text-right" style={{ color: "var(--text-muted)" }}>גרור את הידית לשינוי הסדר</p>

      <section className="rounded-2xl border p-6" style={{ borderColor: "var(--border)" }}>
        {error && <p className="text-sm text-center mb-3" style={{ color: "var(--maroon)" }}>{error}</p>}
        {categories.length === 0 && (
          <p className="text-sm text-right mb-4" style={{ color: "var(--text-muted)" }}>אין קטגוריות עדיין</p>
        )}
        <DragList
          items={categories}
          keyOf={(c) => c.id}
          onReorder={reorderCategories}
          gap={8}
          handleLabel="גרור לשינוי סדר הקטגוריה"
          className="flex flex-col gap-2 mb-4"
        >
          {({ item: cat, dragging, handle }) => {
            const isExpanded = expandedId === cat.id;
            const isEditing = editing?.id === cat.id;
            const catProducts = products[cat.id];
            return (
              <div
                className="rounded-xl border overflow-hidden"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--cream)",
                  boxShadow: dragging ? "0 10px 24px rgba(0,0,0,0.18)" : undefined,
                }}
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {isEditing ? (
                      <>
                        <button onClick={() => setEditing(null)} className="text-xs hover:opacity-70" style={{ color: "var(--text-muted)" }}>ביטול</button>
                        <button onClick={saveRename} className="text-xs font-bold hover:opacity-70" style={{ color: "var(--green)" }}>שמור</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => deleteCategory(cat.id)} className="text-xs hover:opacity-70" style={{ color: "var(--maroon)" }}>מחק</button>
                        <button onClick={() => setEditing({ id: cat.id, name: cat.nameHe })} className="text-xs hover:opacity-70" style={{ color: "var(--text)" }}>ערוך</button>
                        <DragHandle handle={handle} />
                      </>
                    )}
                  </div>
                  {isEditing ? (
                    <input
                      type="text"
                      autoFocus
                      onFocus={(e) => e.target.select()}
                      value={editing.name}
                      onChange={(e) => setEditing({ id: cat.id, name: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveRename();
                        if (e.key === "Escape") setEditing(null);
                      }}
                      aria-label="שם הקטגוריה"
                      className="flex-1 min-w-0 mr-3 px-3 py-1.5 rounded-lg border text-right outline-none text-base sm:text-sm"
                      style={inputStyle}
                    />
                  ) : (
                  <button onClick={() => toggleExpand(cat.id)} className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                    <span className="font-medium text-right" style={{ color: "var(--text)" }}>{cat.nameHe}</span>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ color: "var(--text-muted)", transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                  )}
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t pt-3" style={{ borderColor: "var(--border)" }}>
                    {loadingProducts !== cat.id && (
                      <button
                        onClick={() => setPicker({ name: cat.nameHe, categoryId: cat.id })}
                        className="w-full mb-3 py-2 rounded-lg border text-sm font-bold transition-opacity hover:opacity-70"
                        style={{ borderColor: "var(--text)", color: "var(--text)" }}
                      >
                        בחירת מוצרים{catProducts ? ` (${catProducts.length})` : ""}
                      </button>
                    )}
                    {loadingProducts === cat.id ? (
                      <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>טוען...</p>
                    ) : !catProducts || catProducts.length === 0 ? (
                      <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>אין מוצרים בקטגוריה זו</p>
                    ) : (
                      <>
                        <p className="text-xs text-right mb-2" style={{ color: "var(--text-muted)" }}>סדר הופעת המוצרים בקטגוריה זו בעמוד הבית</p>
                        <DragList
                          items={catProducts}
                          keyOf={(p) => p.id}
                          onReorder={(next) => reorderProducts(cat.id, next)}
                          gap={8}
                          handleLabel="גרור לשינוי סדר המוצר"
                          className="flex flex-col gap-2"
                        >
                          {({ item: p, dragging: productDragging, handle: productHandle }) => (
                            <div
                              className="flex items-center gap-3 px-3 py-2 rounded-lg border"
                              style={{
                                borderColor: "var(--border)",
                                background: "var(--cream-dark)",
                                opacity: p.active ? 1 : 0.5,
                                boxShadow: productDragging ? "0 8px 18px rgba(0,0,0,0.16)" : undefined,
                              }}
                            >
                              <DragHandle handle={productHandle} size={14} />
                              {p.image ? (
                                <div className="relative w-9 h-9 rounded-md overflow-hidden flex-shrink-0 border" style={{ borderColor: "var(--border)" }}>
                                  <Image src={p.image} alt={p.nameHe} fill className="object-cover" sizes="36px" />
                                </div>
                              ) : (
                                <div className="w-9 h-9 rounded-md flex-shrink-0" style={{ background: "var(--cream)" }} />
                              )}
                              <span className="text-sm flex-1 text-right truncate" style={{ color: "var(--text)" }}>
                                {p.nameHe}{!p.active && " (לא פעיל)"}
                              </span>
                            </div>
                          )}
                        </DragList>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          }}
        </DragList>

        <div className="flex gap-2">
          <button
            onClick={addCategory}
            className="px-4 py-2.5 rounded-xl font-medium text-sm transition-opacity hover:opacity-70 flex-shrink-0"
            style={{ background: "var(--text)", color: "var(--cream)" }}
          >
            הוסף
          </button>
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addCategory(); }}
            placeholder="שם קטגוריה חדשה..."
            className="flex-1 px-4 py-2.5 rounded-xl border text-right outline-none text-sm"
            style={inputStyle}
          />
        </div>
      </section>
    </div>
    {picker && (
      <CategoryProductPicker
        title={picker.categoryId ? `מוצרים בקטגוריה "${picker.name}"` : `אילו מוצרים בקטגוריה "${picker.name}"?`}
        initialSelected={picker.categoryId ? (products[picker.categoryId] ?? []).map((p) => p.id) : []}
        saveLabel={picker.categoryId ? "שמור" : "צור קטגוריה"}
        onSave={(ids) => (picker.categoryId ? setCategoryProducts(picker.categoryId, ids) : createCategory(ids))}
        onCancel={() => setPicker(null)}
      />
    )}
    {confirmState && (
      <ConfirmModal
        message={confirmState.message}
        confirmLabel="מחק"
        danger
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(null)}
      />
    )}
    </>
  );
}
