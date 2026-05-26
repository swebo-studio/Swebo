"use client";
import { useState, useRef } from "react";
import Image from "next/image";

interface ProductImage { id: string; url: string; sortOrder: number }
interface ProductColor { id: string; nameHe: string; hex: string; stock: number; imageUrl?: string | null }

interface Product {
  id: string;
  nameHe: string;
  descriptionHe: string;
  price: number;
  stock: number;
  image: string;
  active: boolean;
  images: ProductImage[];
  colors: ProductColor[];
}

const EMPTY: Omit<Product, "id" | "images" | "colors"> = {
  nameHe: "", descriptionHe: "", price: 150, stock: 0, image: "", active: true,
};

type Tab = "details" | "images" | "colors";

export default function ProductsManager({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Omit<Product, "id" | "images" | "colors">>(EMPTY);
  const [tab, setTab] = useState<Tab>("details");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryFileRef = useRef<HTMLInputElement>(null);

  // Color form state
  const [colorForm, setColorForm] = useState({ nameHe: "", hex: "#000000", stock: 0, imageUrl: "" });
  const [addingColor, setAddingColor] = useState(false);
  const [editingColor, setEditingColor] = useState<ProductColor | null>(null);
  const colorImageRef = useRef<HTMLInputElement>(null);
  const editColorImageRef = useRef<HTMLInputElement>(null);

  function openCreate() {
    setForm(EMPTY);
    setEditing(null);
    setCreating(true);
    setTab("details");
  }

  function openEdit(p: Product) {
    setForm({ nameHe: p.nameHe, descriptionHe: p.descriptionHe, price: p.price, stock: p.stock, image: p.image, active: p.active });
    setEditing(p);
    setCreating(false);
    setTab("details");
  }

  function closeForm() {
    setEditing(null);
    setCreating(false);
    setAddingColor(false);
    setEditingColor(null);
  }

  async function uploadImage(file: File): Promise<string> {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    return data.url as string;
  }

  async function handlePrimaryImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file);
    setForm((f) => ({ ...f, image: url }));
  }

  async function handleGalleryImageAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    const url = await uploadImage(file);
    const res = await fetch(`/api/products/${editing.id}/images`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const newImg = await res.json();
    setEditing((p) => p ? { ...p, images: [...p.images, newImg] } : p);
    setProducts((list) => list.map((p) => p.id === editing.id ? { ...p, images: [...p.images, newImg] } : p));
    if (galleryFileRef.current) galleryFileRef.current.value = "";
  }

  async function handleDeleteImage(imageId: string) {
    if (!editing) return;
    await fetch(`/api/products/${editing.id}/images/${imageId}`, { method: "DELETE" });
    setEditing((p) => p ? { ...p, images: p.images.filter((i) => i.id !== imageId) } : p);
    setProducts((list) => list.map((p) => p.id === editing.id ? { ...p, images: p.images.filter((i) => i.id !== imageId) } : p));
  }

  async function handleColorImageUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    target: "form" | "edit"
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file);
    if (target === "form") {
      setColorForm((f) => ({ ...f, imageUrl: url }));
    } else {
      setEditingColor((c) => c ? { ...c, imageUrl: url } : c);
    }
  }

  async function handleAddColor() {
    if (!editing || !colorForm.nameHe) return;
    setAddingColor(true);
    const res = await fetch(`/api/products/${editing.id}/colors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...colorForm, imageUrl: colorForm.imageUrl || null }),
    });
    const newColor = await res.json();
    setEditing((p) => p ? { ...p, colors: [...p.colors, newColor] } : p);
    setProducts((list) => list.map((p) => p.id === editing.id ? { ...p, colors: [...p.colors, newColor] } : p));
    setColorForm({ nameHe: "", hex: "#000000", stock: 0, imageUrl: "" });
    if (colorImageRef.current) colorImageRef.current.value = "";
    setAddingColor(false);
  }

  async function handleSaveColor(color: ProductColor) {
    if (!editing) return;
    const res = await fetch(`/api/products/${editing.id}/colors/${color.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nameHe: color.nameHe, hex: color.hex, stock: color.stock, imageUrl: color.imageUrl ?? null }),
    });
    const updated = await res.json();
    setEditing((p) => p ? { ...p, colors: p.colors.map((c) => c.id === updated.id ? updated : c) } : p);
    setProducts((list) => list.map((p) => p.id === editing.id ? { ...p, colors: p.colors.map((c) => c.id === updated.id ? updated : c) } : p));
    setEditingColor(null);
  }

  async function handleDeleteColor(colorId: string) {
    if (!editing) return;
    await fetch(`/api/products/${editing.id}/colors/${colorId}`, { method: "DELETE" });
    setEditing((p) => p ? { ...p, colors: p.colors.filter((c) => c.id !== colorId) } : p);
    setProducts((list) => list.map((p) => p.id === editing.id ? { ...p, colors: p.colors.filter((c) => c.id !== colorId) } : p));
  }

  async function handleSave() {
    setSaving(true);
    if (editing) {
      const res = await fetch(`/api/products/${editing.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const updated = await res.json();
      setProducts((p) => p.map((x) => x.id === editing.id ? { ...x, ...updated } : x));
      setEditing((p) => p ? { ...p, ...updated } : p);
    } else {
      const res = await fetch("/api/products", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const created = await res.json();
      const full = { ...created, images: [], colors: [] };
      setProducts((p) => [full, ...p]);
      setEditing(full);
      setCreating(false);
      setTab("images");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("למחוק מוצר זה?")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    setProducts((p) => p.filter((x) => x.id !== id));
  }

  const showForm = creating || editing !== null;
  const isEdit = editing !== null;

  const inputStyle = {
    background: "var(--cream-dark)", borderColor: "var(--border)", color: "var(--text)",
  };

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

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div
            className="w-full max-w-lg rounded-3xl overflow-hidden"
            style={{ background: "var(--cream)" }}
          >
            {/* Tab bar */}
            <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
              {(["details", "images", "colors"] as Tab[]).map((t) => {
                const labels: Record<Tab, string> = { details: "פרטים", images: "תמונות", colors: "צבעים" };
                const disabled = !isEdit && t !== "details";
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
                  {/* Primary image */}
                  <div className="flex flex-col items-end gap-2">
                    <label className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>תמונה ראשית</label>
                    {form.image && (
                      <div className="relative w-32 h-32 rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                        <Image src={form.image} alt="תצוגה מקדימה" fill className="object-cover" />
                      </div>
                    )}
                    <input type="file" accept="image/*" ref={fileRef} onChange={handlePrimaryImageChange} className="hidden" />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="px-4 py-2 rounded-xl border text-sm transition-opacity hover:opacity-70 disabled:opacity-40"
                      style={{ borderColor: "var(--border)", color: "var(--text)" }}
                    >
                      {uploading ? "מעלה..." : "בחר תמונה"}
                    </button>
                  </div>

                  {[
                    { key: "nameHe", label: "שם המוצר", type: "text" },
                    { key: "descriptionHe", label: "תיאור", type: "text" },
                    { key: "price", label: "מחיר (₪)", type: "number" },
                    { key: "stock", label: "מלאי (ללא צבעים)", type: "number" },
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
                    <button onClick={handleSave} disabled={saving || uploading || !form.nameHe} className="flex-1 py-3 rounded-xl font-bold transition-opacity disabled:opacity-50" style={{ background: "var(--text)", color: "var(--cream)" }}>
                      {saving ? "שומר..." : isEdit ? "שמור" : "צור מוצר ←"}
                    </button>
                  </div>
                </div>
              )}

              {/* ── IMAGES TAB ── */}
              {tab === "images" && editing && (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-right" style={{ color: "var(--text-muted)" }}>
                    הוסף מספר תמונות למוצר — הראשונה תוצג בגלריה
                  </p>

                  <div className="grid grid-cols-3 gap-3">
                    {editing.images.map((img) => (
                      <div key={img.id} className="relative group">
                        <div className="relative w-full aspect-square rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                          <Image src={img.url} alt="תמונה" fill className="object-cover" />
                        </div>
                        <button
                          onClick={() => handleDeleteImage(img.id)}
                          className="absolute top-1 left-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    {/* Add button */}
                    <button
                      onClick={() => galleryFileRef.current?.click()}
                      disabled={uploading}
                      className="aspect-square rounded-xl border-2 border-dashed flex items-center justify-center text-2xl transition-opacity hover:opacity-70 disabled:opacity-40"
                      style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                    >
                      {uploading ? "⏳" : "+"}
                    </button>
                  </div>

                  <input type="file" accept="image/*" ref={galleryFileRef} onChange={handleGalleryImageAdd} className="hidden" />

                  <button onClick={closeForm} className="w-full py-3 rounded-xl border font-medium mt-2 transition-opacity hover:opacity-70" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>סגור</button>
                </div>
              )}

              {/* ── COLORS TAB ── */}
              {tab === "colors" && editing && (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-right" style={{ color: "var(--text-muted)" }}>
                    הוסף גרסאות צבע — כל צבע מנהל מלאי נפרד
                  </p>

                  {/* Existing colors */}
                  <div className="flex flex-col gap-2">
                    {editing.colors.map((c) =>
                      editingColor?.id === c.id ? (
                        <div key={c.id} className="flex flex-col gap-2 p-3 rounded-xl border" style={{ borderColor: "var(--border)" }}>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={editingColor.hex}
                              onChange={(e) => setEditingColor({ ...editingColor, hex: e.target.value })}
                              className="w-10 h-10 rounded-lg border cursor-pointer flex-shrink-0"
                              style={{ borderColor: "var(--border)" }}
                            />
                            <input
                              type="text"
                              value={editingColor.nameHe}
                              onChange={(e) => setEditingColor({ ...editingColor, nameHe: e.target.value })}
                              placeholder="שם הצבע"
                              className="flex-1 px-3 py-2 rounded-xl border text-right outline-none text-sm"
                              style={inputStyle}
                            />
                            <input
                              type="number"
                              value={editingColor.stock}
                              onChange={(e) => setEditingColor({ ...editingColor, stock: Number(e.target.value) })}
                              placeholder="מלאי"
                              className="w-20 px-3 py-2 rounded-xl border text-right outline-none text-sm"
                              style={inputStyle}
                            />
                          </div>
                          {/* Color image */}
                          <div className="flex items-center gap-3 justify-end">
                            {editingColor.imageUrl && (
                              <div className="relative w-14 h-14 rounded-lg overflow-hidden border flex-shrink-0" style={{ borderColor: "var(--border)" }}>
                                <Image src={editingColor.imageUrl} alt="תמונת צבע" fill className="object-cover" />
                              </div>
                            )}
                            <input type="file" accept="image/*" ref={editColorImageRef} onChange={(e) => handleColorImageUpload(e, "edit")} className="hidden" />
                            <button
                              type="button"
                              onClick={() => editColorImageRef.current?.click()}
                              disabled={uploading}
                              className="px-3 py-1.5 rounded-lg border text-xs transition-opacity hover:opacity-70 disabled:opacity-40"
                              style={{ borderColor: "var(--border)", color: "var(--text)" }}
                            >
                              {uploading ? "מעלה..." : editingColor.imageUrl ? "החלף תמונה" : "הוסף תמונה לצבע"}
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleSaveColor(editingColor)} className="flex-1 py-2 rounded-xl text-xs font-bold" style={{ background: "var(--text)", color: "var(--cream)" }}>שמור</button>
                            <button onClick={() => setEditingColor(null)} className="flex-1 py-2 rounded-xl text-xs border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>ביטול</button>
                          </div>
                        </div>
                      ) : (
                        <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: "var(--border)" }}>
                          {c.imageUrl ? (
                            <div className="relative w-10 h-10 rounded-lg overflow-hidden border flex-shrink-0" style={{ borderColor: "var(--border)" }}>
                              <Image src={c.imageUrl} alt={c.nameHe} fill className="object-cover" />
                            </div>
                          ) : (
                            <span className="w-10 h-10 rounded-full border flex-shrink-0" style={{ background: c.hex, borderColor: "var(--border)" }} />
                          )}
                          <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: c.hex, border: "1px solid var(--border)" }} />
                          <span className="flex-1 font-medium text-right text-sm" style={{ color: "var(--text)" }}>{c.nameHe}</span>
                          <span className="text-sm" style={{ color: c.stock <= 3 ? "var(--maroon)" : "var(--green)" }}>{c.stock} במלאי</span>
                          <button onClick={() => setEditingColor(c)} className="px-2 py-1 rounded-lg text-xs border transition-opacity hover:opacity-70" style={{ borderColor: "var(--border)", color: "var(--text)" }}>עריכה</button>
                          <button onClick={() => handleDeleteColor(c.id)} className="px-2 py-1 rounded-lg text-xs border transition-opacity hover:opacity-70" style={{ borderColor: "#f5e8e8", color: "var(--maroon)" }}>מחק</button>
                        </div>
                      )
                    )}
                  </div>

                  {/* Add color form */}
                  <div className="p-4 rounded-xl border flex flex-col gap-3" style={{ borderColor: "var(--border)", background: "var(--cream-dark)" }}>
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
                        placeholder="שם הצבע (למשל: ירוק, אדום)"
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
                    {/* Color image upload */}
                    <div className="flex items-center gap-3 justify-end">
                      {colorForm.imageUrl && (
                        <div className="relative w-14 h-14 rounded-lg overflow-hidden border flex-shrink-0" style={{ borderColor: "var(--border)" }}>
                          <Image src={colorForm.imageUrl} alt="תמונת צבע" fill className="object-cover" />
                        </div>
                      )}
                      <input type="file" accept="image/*" ref={colorImageRef} onChange={(e) => handleColorImageUpload(e, "form")} className="hidden" />
                      <button
                        type="button"
                        onClick={() => colorImageRef.current?.click()}
                        disabled={uploading}
                        className="px-3 py-1.5 rounded-lg border text-xs transition-opacity hover:opacity-70 disabled:opacity-40"
                        style={{ borderColor: "var(--border)", color: "var(--text)" }}
                      >
                        {uploading ? "מעלה..." : colorForm.imageUrl ? "החלף תמונה" : "הוסף תמונה לצבע (אופציונלי)"}
                      </button>
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
                  {["תמונה", "שם", "מחיר", "מלאי", "צבעים", "סטטוס", "פעולות"].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const displayImg = p.images[0]?.url || p.image;
                  const hasColors = p.colors.length > 0;
                  const stockDisplay = hasColors
                    ? p.colors.reduce((s, c) => s + c.stock, 0)
                    : p.stock;
                  return (
                    <tr key={p.id} style={{ borderBottom: `1px solid var(--border)` }}>
                      <td className="px-4 py-3">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                          {displayImg ? (
                            <Image src={displayImg} alt={p.nameHe} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">👕</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium" style={{ color: "var(--text)" }}>{p.nameHe}</td>
                      <td className="px-4 py-3 font-bold" style={{ color: "var(--text)" }}>₪{p.price}</td>
                      <td className="px-4 py-3">
                        <span style={{ color: stockDisplay <= 3 ? "var(--maroon)" : "var(--green)", fontWeight: "bold" }}>
                          {stockDisplay}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {hasColors ? (
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
