"use client";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import ImageCropModal from "@/components/ImageCropModal";

interface Category { id: string; nameHe: string }

interface ColorImage { id: string; url: string; sortOrder: number }
interface SizeStock { size: string; stock: number }

interface ProductColor {
  id: string;
  nameHe: string;
  hex: string;
  stock: number;
  images: ColorImage[];
}

const SIZES = ["S", "M", "L", "XL"];

interface Product {
  id: string;
  nameHe: string;
  descriptionHe: string;
  price: number;
  stock: number;
  image: string;
  active: boolean;
  categories: { id: string; nameHe: string }[];
  colors: ProductColor[];
}

const EMPTY_FORM = { nameHe: "", descriptionHe: "", price: 150, stock: 0, active: true };

export default function ProductsManager({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [tab, setTab] = useState<"details" | "colors">("details");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/categories").then((r) => r.json()).then(setCategories).catch(() => {});
  }, []);

  // Color form
  const [colorForm, setColorForm] = useState({ nameHe: "", hex: "#000000", stock: 0 });
  const [addingColor, setAddingColor] = useState(false);
  const [editingColor, setEditingColor] = useState<ProductColor | null>(null);

  // Size stocks per color: colorId → SizeStock[]
  const [sizeStocks, setSizeStocks] = useState<Record<string, SizeStock[]>>({});
  const [savingSizes, setSavingSizes] = useState<Record<string, boolean>>({});

  // Which color's "add photo" input is active
  const colorImageRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Crop modal
  type CropContext = { type: "colorImage"; colorId: string };
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropContext, setCropContext] = useState<CropContext | null>(null);

  const inputStyle = { background: "var(--cream-dark)", borderColor: "var(--border)", color: "var(--text)" };

  function openCreate() {
    setForm(EMPTY_FORM);
    setSelectedCategoryIds([]);
    setEditing(null);
    setCreating(true);
    setTab("details");
  }

  function openEdit(p: Product) {
    setForm({ nameHe: p.nameHe, descriptionHe: p.descriptionHe, price: p.price, stock: p.stock, active: p.active });
    setSelectedCategoryIds(p.categories.map((c) => c.id));
    setEditing(p);
    setCreating(false);
    setTab("details");
  }

  function closeForm() {
    setEditing(null);
    setCreating(false);
    setEditingColor(null);
    setColorForm({ nameHe: "", hex: "#000000", stock: 0 });
  }

  async function loadSizeStocks(colorId: string) {
    if (!editing) return;
    const res = await fetch(`/api/products/${editing.id}/colors/${colorId}/sizes`);
    const data: SizeStock[] = await res.json();
    setSizeStocks((prev) => ({ ...prev, [colorId]: data }));
  }

  async function saveSizeStocks(colorId: string) {
    if (!editing) return;
    setSavingSizes((prev) => ({ ...prev, [colorId]: true }));
    const stocks = sizeStocks[colorId] ?? SIZES.map((size) => ({ size, stock: 0 }));
    await fetch(`/api/products/${editing.id}/colors/${colorId}/sizes`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(stocks),
    });
    // Update color total stock locally
    const total = stocks.reduce((s, r) => s + r.stock, 0);
    const updatedColors = editing.colors.map((c) => c.id === colorId ? { ...c, stock: total } : c);
    setEditing((p) => p ? { ...p, colors: updatedColors } : p);
    setProducts((list) => list.map((p) => p.id === editing.id ? { ...p, colors: updatedColors } : p));
    setSavingSizes((prev) => ({ ...prev, [colorId]: false }));
  }

  async function uploadBlob(blob: Blob): Promise<string> {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", new File([blob], "image.jpg", { type: "image/jpeg" }));
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    return data.url as string;
  }

  async function handleCropConfirm(blob: Blob) {
    const ctx = cropContext;
    setCropFile(null);
    setCropContext(null);
    if (!ctx || !editing) return;

    const url = await uploadBlob(blob);

    if (ctx.type === "colorImage") {
      const res = await fetch(`/api/products/${editing.id}/colors/${ctx.colorId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const newImg: ColorImage = await res.json();
      // Update local state
      const updatedColors = editing.colors.map((c) =>
        c.id === ctx.colorId ? { ...c, images: [...c.images, newImg] } : c
      );
      const updatedProduct = { ...editing, colors: updatedColors };
      // If this is the first image of the first color, update display image too
      if (updatedColors[0]?.id === ctx.colorId && updatedColors[0].images.length === 1) {
        updatedProduct.image = url;
      }
      setEditing(updatedProduct);
      setProducts((list) => list.map((p) => p.id === editing.id ? updatedProduct : p));
      // Reset file input
      if (colorImageRefs.current[ctx.colorId]) colorImageRefs.current[ctx.colorId]!.value = "";
    }
  }

  function handleCropCancel() {
    setCropFile(null);
    setCropContext(null);
    Object.values(colorImageRefs.current).forEach((ref) => { if (ref) ref.value = ""; });
  }

  function handleColorImagePick(e: React.ChangeEvent<HTMLInputElement>, colorId: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropContext({ type: "colorImage", colorId });
    setCropFile(file);
  }

  async function handleDeleteColorImage(colorId: string, imageId: string) {
    if (!editing) return;
    await fetch(`/api/products/${editing.id}/colors/${colorId}/images/${imageId}`, { method: "DELETE" });
    const updatedColors = editing.colors.map((c) =>
      c.id === colorId ? { ...c, images: c.images.filter((i) => i.id !== imageId) } : c
    );
    // Recalculate display image
    const newDisplayImage = updatedColors[0]?.images[0]?.url ?? "";
    const updatedProduct = { ...editing, colors: updatedColors, image: newDisplayImage };
    setEditing(updatedProduct);
    setProducts((list) => list.map((p) => p.id === editing.id ? updatedProduct : p));
  }

  async function handleSave() {
    setSaving(true);
    if (editing) {
      const res = await fetch(`/api/products/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, image: editing.image, categoryIds: selectedCategoryIds }),
      });
      const updated = await res.json();
      const updatedProduct = { ...editing, ...updated };
      setProducts((p) => p.map((x) => x.id === editing.id ? updatedProduct : x));
      setEditing(updatedProduct);
    } else {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, categoryIds: selectedCategoryIds }),
      });
      const created = await res.json();
      const full: Product = { ...created, colors: [], categories: created.categories ?? [] };
      setProducts((p) => [full, ...p]);
      setEditing(full);
      setCreating(false);
      setTab("colors");
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleAddColor() {
    if (!editing || !colorForm.nameHe) return;
    setAddingColor(true);
    const res = await fetch(`/api/products/${editing.id}/colors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(colorForm),
    });
    const newColor: ProductColor = await res.json();
    const updatedProduct = { ...editing, colors: [...editing.colors, newColor] };
    setEditing(updatedProduct);
    setProducts((list) => list.map((p) => p.id === editing.id ? updatedProduct : p));
    setColorForm({ nameHe: "", hex: "#000000", stock: 0 });
    setAddingColor(false);
  }

  async function handleSaveColor(color: ProductColor) {
    if (!editing) return;
    const res = await fetch(`/api/products/${editing.id}/colors/${color.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nameHe: color.nameHe, hex: color.hex, stock: color.stock }),
    });
    const updated: ProductColor = await res.json();
    const updatedColors = editing.colors.map((c) => c.id === updated.id ? { ...updated, images: c.images } : c);
    const updatedProduct = { ...editing, colors: updatedColors };
    setEditing(updatedProduct);
    setProducts((list) => list.map((p) => p.id === editing.id ? updatedProduct : p));
    setEditingColor(null);
  }

  async function handleDeleteColor(colorId: string) {
    if (!editing || !confirm("למחוק צבע זה?")) return;
    await fetch(`/api/products/${editing.id}/colors/${colorId}`, { method: "DELETE" });
    const updatedColors = editing.colors.filter((c) => c.id !== colorId);
    const newDisplayImage = updatedColors[0]?.images[0]?.url ?? "";
    const updatedProduct = { ...editing, colors: updatedColors, image: newDisplayImage };
    setEditing(updatedProduct);
    setProducts((list) => list.map((p) => p.id === editing.id ? updatedProduct : p));
  }

  async function handleDelete(id: string) {
    if (!confirm("למחוק מוצר זה?")) return;
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "לא ניתן למחוק מוצר זה");
      return;
    }
    setProducts((p) => p.filter((x) => x.id !== id));
  }

  const showForm = creating || editing !== null;
  const isEdit = editing !== null;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={openCreate}
          className="px-5 py-2.5 rounded-xl font-bold text-sm transition-opacity hover:opacity-80"
          style={{ background: "var(--text)", color: "var(--cream)" }}
        >
          + הוסף מוצר
        </button>
        <h1 className="text-2xl font-extrabold" style={{ color: "var(--text)" }}>ניהול מוצרים</h1>
      </div>

      {/* Crop modal */}
      {cropFile && (
        <ImageCropModal file={cropFile} onConfirm={handleCropConfirm} onCancel={handleCropCancel} />
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl overflow-hidden" style={{ background: "var(--cream)" }}>
            {/* Tab bar */}
            <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
              {(["details", "colors"] as const).map((t) => {
                const labels = { details: "פרטים", colors: "צבעים" };
                const disabled = !isEdit && t === "colors";
                return (
                  <button
                    key={t}
                    onClick={() => !disabled && setTab(t)}
                    disabled={disabled}
                    className="flex-1 py-3 text-sm font-bold transition-colors disabled:opacity-30"
                    style={{
                      color: tab === t ? "var(--text)" : "var(--text-muted)",
                      borderBottom: tab === t ? "2px solid var(--text)" : "2px solid transparent",
                      background: "transparent",
                    }}
                  >
                    {labels[t]}
                  </button>
                );
              })}
            </div>

            <div className="p-6 overflow-y-auto max-h-[75vh]">
              {/* ── DETAILS TAB ── */}
              {tab === "details" && (
                <div className="flex flex-col gap-4">
                  {[
                    { key: "nameHe", label: "שם המוצר", type: "text" },
                    { key: "descriptionHe", label: "תיאור", type: "text" },
                    { key: "price", label: "מחיר (₪)", type: "number" },
                  ].map((field) => (
                    <div key={field.key} className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-right" style={{ color: "var(--text-muted)" }}>{field.label}</label>
                      <input
                        type={field.type}
                        value={String(form[field.key as keyof typeof form])}
                        onChange={(e) => setForm((f) => ({ ...f, [field.key]: field.type === "number" ? Number(e.target.value) : e.target.value }))}
                        className="px-4 py-3 rounded-xl border text-right outline-none"
                        style={inputStyle}
                      />
                    </div>
                  ))}

                  {/* Category multi-select */}
                  {categories.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-right" style={{ color: "var(--text-muted)" }}>קטגוריות (ניתן לבחור מספר)</label>
                      <div className="flex flex-col gap-1.5 p-3 rounded-xl border" style={{ borderColor: "var(--border)" }}>
                        {categories.map((cat) => {
                          const checked = selectedCategoryIds.includes(cat.id);
                          return (
                            <label key={cat.id} className="flex items-center justify-end gap-2 cursor-pointer select-none text-sm" style={{ color: "var(--text)" }}>
                              {cat.nameHe}
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => setSelectedCategoryIds((prev) =>
                                  checked ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                                )}
                                className="w-4 h-4 rounded"
                                style={{ accentColor: "var(--text)" }}
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Active toggle */}
                  <label className="flex items-center justify-end gap-3 cursor-pointer">
                    <span className="text-sm" style={{ color: "var(--text-muted)" }}>פעיל בחנות</span>
                    <div
                      className="relative w-12 h-6 rounded-full transition-colors"
                      style={{ background: form.active ? "var(--green)" : "var(--border)" }}
                      onClick={() => setForm((f) => ({ ...f, active: !f.active }))}
                    >
                      <div
                        className="absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow"
                        style={{ transform: form.active ? "translateX(-28px)" : "translateX(-4px)" }}
                      />
                    </div>
                  </label>

                  <div className="flex gap-3 mt-2">
                    <button onClick={closeForm} className="flex-1 py-3 rounded-xl border font-medium transition-opacity hover:opacity-70" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>ביטול</button>
                    <button onClick={handleSave} disabled={saving || !form.nameHe} className="flex-1 py-3 rounded-xl font-bold transition-all disabled:opacity-50" style={{ background: saved ? "var(--green)" : "var(--text)", color: "var(--cream)" }}>
                      {saving ? "שומר..." : saved ? "✓ נשמר!" : isEdit ? "שמור" : "המשך לצבעים ←"}
                    </button>
                  </div>
                </div>
              )}

              {/* ── COLORS TAB ── */}
              {tab === "colors" && editing && (
                <div className="flex flex-col gap-5">
                  {editing.colors.length === 0 && (
                    <p className="text-sm text-right" style={{ color: "var(--text-muted)" }}>
                      הוסף לפחות צבע אחד — תמונת הצבע הראשון תשמש כתמונת המוצר
                    </p>
                  )}

                  {/* Existing colors */}
                  {editing.colors.map((c) => (
                    <div key={c.id} className="rounded-2xl border p-4 flex flex-col gap-3" style={{ borderColor: "var(--border)" }}>
                      {/* Color header row */}
                      {editingColor?.id === c.id ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleSaveColor(editingColor)} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: "var(--text)", color: "var(--cream)" }}>שמור</button>
                          <button onClick={() => setEditingColor(null)} className="px-3 py-1.5 rounded-lg text-xs border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>ביטול</button>
                          <input
                            type="number"
                            value={editingColor.stock}
                            onChange={(e) => setEditingColor({ ...editingColor, stock: Number(e.target.value) })}
                            className="w-20 px-3 py-2 rounded-xl border text-right outline-none text-sm"
                            style={inputStyle}
                            placeholder="מלאי"
                          />
                          <input
                            type="text"
                            value={editingColor.nameHe}
                            onChange={(e) => setEditingColor({ ...editingColor, nameHe: e.target.value })}
                            className="flex-1 px-3 py-2 rounded-xl border text-right outline-none text-sm"
                            style={inputStyle}
                          />
                          <input
                            type="color"
                            value={editingColor.hex}
                            onChange={(e) => setEditingColor({ ...editingColor, hex: e.target.value })}
                            className="w-10 h-10 rounded-lg border cursor-pointer flex-shrink-0"
                            style={{ borderColor: "var(--border)" }}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleDeleteColor(c.id)} className="px-2 py-1 rounded-lg text-xs border mr-auto" style={{ borderColor: "#f5e8e8", color: "var(--maroon)" }}>מחק</button>
                          <button onClick={() => setEditingColor(c)} className="px-2 py-1 rounded-lg text-xs border" style={{ borderColor: "var(--border)", color: "var(--text)" }}>עריכה</button>
                          <span className="text-sm font-medium" style={{ color: c.stock <= 3 ? "var(--maroon)" : "var(--green)" }}>{c.stock} במלאי</span>
                          <span className="font-medium text-sm text-right" style={{ color: "var(--text)" }}>{c.nameHe}</span>
                          <span className="w-8 h-8 rounded-full flex-shrink-0 border" style={{ background: c.hex, borderColor: "var(--border)" }} />
                        </div>
                      )}

                      {/* Size stock grid */}
                      <div className="mt-1">
                        <div className="flex items-center justify-between mb-1.5">
                          <button
                            onClick={() => saveSizeStocks(c.id)}
                            disabled={savingSizes[c.id]}
                            className="text-xs px-3 py-1 rounded-lg font-bold transition-opacity disabled:opacity-40"
                            style={{ background: "var(--text)", color: "var(--cream)" }}
                          >
                            {savingSizes[c.id] ? "שומר..." : "שמור מלאי"}
                          </button>
                          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>מלאי לפי מידה</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {SIZES.map((size) => {
                            const current = sizeStocks[c.id]?.find((s) => s.size === size);
                            return (
                              <div key={size} className="flex flex-col items-center gap-1">
                                <span className="text-xs font-bold" style={{ color: "var(--text)" }}>{size}</span>
                                <input
                                  type="number"
                                  min={0}
                                  value={current?.stock ?? 0}
                                  onFocus={() => { if (!sizeStocks[c.id]) loadSizeStocks(c.id); }}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setSizeStocks((prev) => {
                                      const existing = prev[c.id] ?? SIZES.map((s) => ({ size: s, stock: 0 }));
                                      return { ...prev, [c.id]: existing.map((s) => s.size === size ? { ...s, stock: val } : s) };
                                    });
                                  }}
                                  className="w-full px-2 py-1.5 rounded-lg border text-center outline-none text-sm"
                                  style={inputStyle}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Photo grid */}
                      <div className="grid grid-cols-4 gap-2">
                        {c.images.map((img, idx) => (
                          <div key={img.id} className="relative group aspect-square">
                            <div className="relative w-full h-full rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                              <Image src={img.url} alt={`תמונה ${idx + 1}`} fill className="object-cover" sizes="80px" />
                            </div>
                            {idx === 0 && editing.colors[0]?.id === c.id && (
                              <div className="absolute top-1 right-1 text-[10px] px-1 rounded font-bold" style={{ background: "var(--text)", color: "var(--cream)" }}>ראשי</div>
                            )}
                            <button
                              onClick={() => handleDeleteColorImage(c.id, img.id)}
                              className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                            >
                              ✕
                            </button>
                          </div>
                        ))}

                        {/* Add photo button */}
                        <button
                          onClick={() => colorImageRefs.current[c.id]?.click()}
                          disabled={uploading}
                          className="aspect-square rounded-xl border-2 border-dashed flex items-center justify-center text-xl transition-opacity hover:opacity-70 disabled:opacity-40"
                          style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                        >
                          {uploading ? "..." : "+"}
                        </button>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          ref={(el) => { colorImageRefs.current[c.id] = el; }}
                          onChange={(e) => handleColorImagePick(e, c.id)}
                        />
                      </div>
                    </div>
                  ))}

                  {/* Add new color */}
                  <div className="rounded-2xl border p-4 flex flex-col gap-3" style={{ borderColor: "var(--border)", background: "var(--cream-dark)" }}>
                    <p className="text-sm font-bold text-right" style={{ color: "var(--text)" }}>הוסף צבע חדש</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={colorForm.hex}
                        onChange={(e) => setColorForm((f) => ({ ...f, hex: e.target.value }))}
                        className="w-10 h-10 rounded-lg border cursor-pointer flex-shrink-0"
                        style={{ borderColor: "var(--border)" }}
                      />
                      <input
                        type="text"
                        value={colorForm.nameHe}
                        onChange={(e) => setColorForm((f) => ({ ...f, nameHe: e.target.value }))}
                        placeholder="שם הצבע"
                        className="flex-1 px-3 py-2 rounded-xl border text-right outline-none text-sm"
                        style={inputStyle}
                      />
                      <input
                        type="number"
                        value={colorForm.stock}
                        onChange={(e) => setColorForm((f) => ({ ...f, stock: Number(e.target.value) }))}
                        placeholder="מלאי"
                        min={0}
                        className="w-20 px-3 py-2 rounded-xl border text-right outline-none text-sm"
                        style={inputStyle}
                      />
                    </div>
                    <button
                      onClick={handleAddColor}
                      disabled={!colorForm.nameHe || addingColor}
                      className="w-full py-2.5 rounded-xl font-bold text-sm transition-opacity disabled:opacity-40"
                      style={{ background: "var(--text)", color: "var(--cream)" }}
                    >
                      {addingColor ? "מוסיף..." : "+ הוסף צבע"}
                    </button>
                  </div>

                  <button onClick={closeForm} className="w-full py-3 rounded-xl border font-medium transition-opacity hover:opacity-70" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>סגור</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Products table */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
        {products.length === 0 ? (
          <p className="p-10 text-center" style={{ color: "var(--text-muted)" }}>אין מוצרים עדיין</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead>
                <tr style={{ borderBottom: `1px solid var(--border)`, background: "var(--cream-dark)" }}>
                  {["תמונה", "שם", "קטגוריה", "מחיר", "מלאי", "צבעים", "סטטוס", "פעולות"].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const displayImg = p.colors[0]?.images[0]?.url || p.image;
                  const totalStock = p.colors.length > 0
                    ? p.colors.reduce((s, c) => s + c.stock, 0)
                    : p.stock;
                  return (
                    <tr key={p.id} style={{ borderBottom: `1px solid var(--border)` }}>
                      <td className="px-4 py-3">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                          {displayImg ? (
                            <Image src={displayImg} alt={p.nameHe} fill className="object-cover" sizes="48px" />
                          ) : (
                            <div className="w-full h-full" style={{ background: "var(--cream-dark)" }} />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium" style={{ color: "var(--text)" }}>{p.nameHe}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                        {p.categories.length > 0 ? p.categories.map((c) => c.nameHe).join(", ") : "—"}
                      </td>
                      <td className="px-4 py-3 font-bold" style={{ color: "var(--text)" }}>₪{p.price}</td>
                      <td className="px-4 py-3">
                        <span style={{ color: totalStock <= 3 ? "var(--maroon)" : "var(--green)", fontWeight: "bold" }}>{totalStock}</span>
                      </td>
                      <td className="px-4 py-3">
                        {p.colors.length > 0 ? (
                          <div className="flex gap-1 flex-wrap">
                            {p.colors.map((c) => (
                              <span key={c.id} title={c.nameHe} className="w-5 h-5 rounded-full border inline-block" style={{ background: c.hex, borderColor: "var(--border)" }} />
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ background: p.active ? "#e8f5e9" : "#f5e8e8", color: p.active ? "var(--green)" : "var(--maroon)" }}>
                          {p.active ? "פעיל" : "מוסתר"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(p)} className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-opacity hover:opacity-70" style={{ borderColor: "var(--border)", color: "var(--text)" }}>עריכה</button>
                          <button onClick={() => handleDelete(p.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-opacity hover:opacity-70" style={{ borderColor: "#f5e8e8", color: "var(--maroon)" }}>מחיקה</button>
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
