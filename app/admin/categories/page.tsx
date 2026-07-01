"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import ConfirmModal from "@/components/ConfirmModal";

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

  useEffect(() => { fetchCategories(); }, []);

  function fetchCategories() {
    fetch("/api/admin/categories").then((r) => r.json()).then(setCategories).catch(() => {});
  }

  async function addCategory() {
    if (!newCatName.trim()) return;
    await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nameHe: newCatName.trim(), sortOrder: categories.length }),
    });
    setNewCatName("");
    fetchCategories();
  }

  async function deleteCategory(id: string) {
    setConfirmState({ message: "למחוק קטגוריה זו? המוצרים שלה יישארו ללא קטגוריה.", onConfirm: async () => {
      setConfirmState(null);
      await fetch("/api/admin/categories", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (expandedId === id) setExpandedId(null);
      fetchCategories();
    }});
  }

  async function moveCategory(id: string, direction: "up" | "down") {
    const idx = categories.findIndex((c) => c.id === id);
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === categories.length - 1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const updated = categories.map((c, i) => {
      if (i === idx) return { ...c, sortOrder: categories[swapIdx].sortOrder };
      if (i === swapIdx) return { ...c, sortOrder: categories[idx].sortOrder };
      return c;
    });
    setCategories([...updated].sort((a, b) => a.sortOrder - b.sortOrder));
    await fetch("/api/admin/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([
        { id: updated[idx].id, sortOrder: updated[idx].sortOrder },
        { id: updated[swapIdx].id, sortOrder: updated[swapIdx].sortOrder },
      ]),
    });
  }

  async function toggleExpand(catId: string) {
    if (expandedId === catId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(catId);
    if (!products[catId]) {
      setLoadingProducts(catId);
      const res = await fetch(`/api/admin/categories/${catId}/products`);
      const data = await res.json();
      setProducts((prev) => ({ ...prev, [catId]: Array.isArray(data) ? data : [] }));
      setLoadingProducts(null);
    }
  }

  async function moveProduct(catId: string, productId: string, direction: "up" | "down") {
    const list = products[catId];
    if (!list) return;
    const idx = list.findIndex((p) => p.id === productId);
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === list.length - 1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const reordered = [...list];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    setProducts((prev) => ({ ...prev, [catId]: reordered }));
    await fetch(`/api/admin/categories/${catId}/products`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reordered.map((p, i) => ({ productId: p.id, sortOrder: i }))),
    });
  }

  return (
    <>
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-extrabold mb-8 text-right" style={{ color: "var(--text)" }}>ניהול קטגוריות</h1>

      <section className="rounded-2xl border p-6" style={{ borderColor: "var(--border)" }}>
        <div className="flex flex-col gap-2 mb-4">
          {categories.length === 0 && (
            <p className="text-sm text-right" style={{ color: "var(--text-muted)" }}>אין קטגוריות עדיין</p>
          )}
          {categories.map((cat, idx) => {
            const isExpanded = expandedId === cat.id;
            const catProducts = products[cat.id];
            return (
              <div key={cat.id} className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => deleteCategory(cat.id)} className="text-xs hover:opacity-70" style={{ color: "var(--maroon)" }}>מחק</button>
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => moveCategory(cat.id, "up")}
                        disabled={idx === 0}
                        className="text-xs leading-none px-1 hover:opacity-70 disabled:opacity-20"
                        style={{ color: "var(--text)" }}
                      ><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg></button>
                      <button
                        onClick={() => moveCategory(cat.id, "down")}
                        disabled={idx === categories.length - 1}
                        className="text-xs leading-none px-1 hover:opacity-70 disabled:opacity-20"
                        style={{ color: "var(--text)" }}
                      ><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></button>
                    </div>
                  </div>
                  <button onClick={() => toggleExpand(cat.id)} className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                    <span className="font-medium text-right" style={{ color: "var(--text)" }}>{cat.nameHe}</span>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ color: "var(--text-muted)", transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t pt-3" style={{ borderColor: "var(--border)" }}>
                    {loadingProducts === cat.id ? (
                      <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>טוען...</p>
                    ) : !catProducts || catProducts.length === 0 ? (
                      <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>אין מוצרים בקטגוריה זו</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <p className="text-xs text-right mb-1" style={{ color: "var(--text-muted)" }}>סדר הופעת המוצרים בקטגוריה זו בעמוד הבית</p>
                        {catProducts.map((p, pIdx) => (
                          <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--cream-dark)", opacity: p.active ? 1 : 0.5 }}>
                            <div className="flex flex-col gap-0.5">
                              <button
                                onClick={() => moveProduct(cat.id, p.id, "up")}
                                disabled={pIdx === 0}
                                className="text-xs leading-none px-1 hover:opacity-70 disabled:opacity-20"
                                style={{ color: "var(--text)" }}
                              ><svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg></button>
                              <button
                                onClick={() => moveProduct(cat.id, p.id, "down")}
                                disabled={pIdx === catProducts.length - 1}
                                className="text-xs leading-none px-1 hover:opacity-70 disabled:opacity-20"
                                style={{ color: "var(--text)" }}
                              ><svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></button>
                            </div>
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
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

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
