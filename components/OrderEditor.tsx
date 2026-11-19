"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { DELETED_PRODUCT_NAME } from "@/lib/orderItem";

/**
 * The admin's edit of a placed order: customer, delivery, and every line.
 * Saves through PATCH /api/orders/[id] (lib/orderEdit), which moves stock for
 * a paid order and recomputes the totals.
 */

interface EditableItem {
  id: string;
  productId: string | null;
  productName: string;
  quantity: number;
  size: string;
  color: string | null;
  price: number;
}

export interface EditableOrder {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  floor: string | null;
  apartment: string | null;
  city: string;
  deliveryMode: string | null;
  pudoCodeDestination: string | null;
  pudoPointName: string | null;
  subtotal: number;
  delivery: number;
  total: number;
  status: string;
  shipmentNumber: string | null;
  items: EditableItem[];
}

interface ProductOption {
  id: string;
  nameHe: string;
  price: number;
  active: boolean;
  stock: number;
  colors: { nameHe: string; stock: number; sizes: { size: string; stock: number }[] }[];
}

interface Line {
  /** React key; an existing line's id is kept apart in `id` */
  key: string;
  id?: string;
  productId: string | null;
  /** Shown for a line whose product was deleted */
  name: string;
  color: string;
  size: string;
  quantity: number;
  price: number;
}

type Mode = "home" | "epost" | "self";

const inputStyle = { background: "var(--cream-dark)", borderColor: "var(--border)", color: "var(--text)" };
const inputCls = "w-full px-3 py-2 rounded-xl border outline-none text-sm text-right";
const round = (n: number) => Math.round(n * 100) / 100;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-right">
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
      {children}
    </label>
  );
}

export default function OrderEditor({ order, onClose, onSaved }: {
  order: EditableOrder;
  onClose: () => void;
  onSaved: (order: EditableOrder) => void;
}) {
  const [products, setProducts] = useState<ProductOption[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customer, setCustomer] = useState({
    name: order.customerName,
    phone: order.customerPhone,
    email: order.customerEmail,
    address: order.address === "איסוף עצמי" ? "" : order.address,
    city: order.city,
    floor: order.floor ?? "",
    apartment: order.apartment ?? "",
  });
  const [mode, setMode] = useState<Mode>(
    order.deliveryMode === "epost" || order.deliveryMode === "self" ? order.deliveryMode : "home",
  );
  const [pudoName, setPudoName] = useState(order.pudoPointName ?? "");
  const [pudoCode, setPudoCode] = useState(order.pudoCodeDestination ?? "");
  const [delivery, setDelivery] = useState(order.delivery);
  // The coupon's share, which sits on no line: lines − subtotal
  const originalLinesTotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const [discount, setDiscount] = useState(Math.max(0, round(originalLinesTotal - order.subtotal)));
  const [lines, setLines] = useState<Line[]>(() => order.items.map((i) => ({
    key: i.id, id: i.id, productId: i.productId, name: i.productName || DELETED_PRODUCT_NAME,
    color: i.color ?? "", size: i.size, quantity: i.quantity, price: i.price,
  })));

  useEffect(() => {
    fetch("/api/products?withStock=1")
      .then((r) => r.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setLoadError(true));
  }, []);

  // Escape closes, like the other admin dialogs
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !saving) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const productMap = useMemo(() => new Map((products ?? []).map((p) => [p.id, p])), [products]);
  const sortedProducts = useMemo(
    () => (products ?? []).slice().sort((a, b) => Number(b.active) - Number(a.active) || a.nameHe.localeCompare(b.nameHe, "he")),
    [products],
  );

  const linesTotal = lines.reduce((s, l) => s + (Number(l.price) || 0) * (Number(l.quantity) || 0), 0);
  const appliedDiscount = Math.min(discount || 0, linesTotal);
  const newTotal = round(linesTotal - appliedDiscount + (delivery || 0));
  const totalChanged = newTotal !== order.total;

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  /** A product picked for a line: its first colour and size, and its price */
  function pickProduct(key: string, productId: string) {
    const p = productMap.get(productId);
    const color = p?.colors[0];
    updateLine(key, {
      productId: productId || null,
      color: color?.nameHe ?? "",
      size: color?.sizes[0]?.size ?? "",
      price: p?.price ?? 0,
    });
  }

  function pickColor(key: string, line: Line, colorName: string) {
    const color = productMap.get(line.productId ?? "")?.colors.find((c) => c.nameHe === colorName);
    const keepSize = color?.sizes.some((s) => s.size === line.size);
    updateLine(key, { color: colorName, size: keepSize ? line.size : color?.sizes[0]?.size ?? "" });
  }

  function addLine() {
    setLines((prev) => [...prev, { key: `new-${Date.now()}`, productId: null, name: "", color: "", size: "", quantity: 1, price: 0 }]);
  }

  async function save() {
    setError(null);
    if (lines.length === 0) { setError("בהזמנה חייב להיות לפחות פריט אחד"); return; }
    if (lines.some((l) => !l.id && !l.productId)) { setError("יש לבחור מוצר לכל פריט חדש"); return; }
    setSaving(true);
    const res = await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer,
        deliveryMode: mode,
        pudoPointName: pudoName,
        pudoCodeDestination: pudoCode,
        delivery: Number(delivery) || 0,
        discount: Number(discount) || 0,
        items: lines.map((l) => ({
          id: l.id,
          productId: l.productId,
          color: l.color || null,
          size: l.size,
          quantity: Number(l.quantity),
          price: Number(l.price),
        })),
      }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setSaving(false);
    if (!res?.ok) { setError(data?.error ?? "השמירה נכשלה — נסו שוב"); return; }
    onSaved(data);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-stretch sm:items-center justify-center sm:p-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => !saving && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="עריכת הזמנה"
        className="w-full sm:max-w-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[100dvh] sm:max-h-[92dvh]"
        style={{ background: "var(--cream)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="font-extrabold text-lg" style={{ color: "var(--text)" }}>
            עריכת הזמנה <span className="font-mono text-sm" style={{ color: "var(--text-muted)" }}>#{order.id.slice(-6).toUpperCase()}</span>
          </h2>
          <button onClick={onClose} disabled={saving} className="p-1 hover:opacity-70" aria-label="סגור" style={{ color: "var(--text-muted)" }}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
          {order.shipmentNumber && (
            <p role="note" className="text-xs px-3 py-2 rounded-xl" style={{ background: "#fffbeb", color: "#92400e", border: "1px solid #f59e0b" }}>
              ההזמנה כבר נשלחה ל-HFD (משלוח {order.shipmentNumber}). שינוי כאן לא מעדכן את המשלוח אצל HFD — אם הכתובת או הפריטים השתנו, יש לעדכן גם מולם.
            </p>
          )}

          {/* Customer */}
          <section className="flex flex-col gap-3">
            <h3 className="font-bold text-sm" style={{ color: "var(--text)" }}>פרטי לקוח</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="שם"><input className={inputCls} style={inputStyle} value={customer.name} onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))} /></Field>
              <Field label="טלפון"><input className={inputCls} style={inputStyle} dir="ltr" type="tel" value={customer.phone} onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))} /></Field>
              <Field label="אימייל"><input className={inputCls} style={inputStyle} dir="ltr" type="email" value={customer.email} onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))} /></Field>
            </div>
          </section>

          {/* Delivery */}
          <section className="flex flex-col gap-3">
            <h3 className="font-bold text-sm" style={{ color: "var(--text)" }}>משלוח</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="שיטת משלוח">
                <select className={inputCls} style={inputStyle} value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
                  <option value="home">משלוח עד הבית</option>
                  <option value="epost">נקודת איסוף</option>
                  <option value="self">איסוף עצמי</option>
                </select>
              </Field>
              <Field label="דמי משלוח (₪)">
                <input className={inputCls} style={inputStyle} type="number" min={0} step="any" inputMode="decimal" value={delivery} onChange={(e) => setDelivery(e.target.value === "" ? 0 : Number(e.target.value))} />
              </Field>
            </div>
            {mode === "epost" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="שם נקודת האיסוף"><input className={inputCls} style={inputStyle} value={pudoName} onChange={(e) => setPudoName(e.target.value)} /></Field>
                <Field label="קוד נקודה (HFD)"><input className={inputCls} style={inputStyle} dir="ltr" value={pudoCode} onChange={(e) => setPudoCode(e.target.value)} /></Field>
              </div>
            )}
            {mode !== "self" && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="col-span-2"><Field label="כתובת"><input className={inputCls} style={inputStyle} value={customer.address} onChange={(e) => setCustomer((c) => ({ ...c, address: e.target.value }))} /></Field></div>
                <div className="col-span-2"><Field label="עיר"><input className={inputCls} style={inputStyle} value={customer.city} onChange={(e) => setCustomer((c) => ({ ...c, city: e.target.value }))} /></Field></div>
                <Field label="קומה"><input className={inputCls} style={inputStyle} value={customer.floor} onChange={(e) => setCustomer((c) => ({ ...c, floor: e.target.value }))} /></Field>
                <Field label="דירה"><input className={inputCls} style={inputStyle} value={customer.apartment} onChange={(e) => setCustomer((c) => ({ ...c, apartment: e.target.value }))} /></Field>
              </div>
            )}
          </section>

          {/* Items */}
          <section className="flex flex-col gap-3">
            <h3 className="font-bold text-sm" style={{ color: "var(--text)" }}>פריטים</h3>
            {loadError && <p className="text-xs" style={{ color: "var(--maroon)" }}>טעינת המוצרים נכשלה — רעננו את הדף</p>}
            {lines.map((line) => {
              const product = line.productId ? productMap.get(line.productId) : undefined;
              const deleted = !!line.id && !line.productId;
              const color = product?.colors.find((c) => c.nameHe === line.color);
              const sizes = color?.sizes ?? [];
              return (
                <div key={line.key} className="flex flex-col gap-2 p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--cream-dark)" }}>
                  <div className="flex items-end gap-2">
                    <div className="flex-1 min-w-0">
                      {deleted ? (
                        <Field label="מוצר">
                          <p className="text-sm py-2" style={{ color: "var(--text)" }}>{line.name} <span className="text-xs" style={{ color: "var(--text-muted)" }}>(המוצר נמחק מהאתר — אפשר לשנות כמות ומחיר בלבד)</span></p>
                        </Field>
                      ) : (
                        <Field label="מוצר">
                          <select className={inputCls} style={{ ...inputStyle, background: "var(--cream)" }} value={line.productId ?? ""} onChange={(e) => pickProduct(line.key, e.target.value)} disabled={!products}>
                            <option value="">{products ? "בחרו מוצר" : "טוען מוצרים..."}</option>
                            {sortedProducts.map((p) => (
                              <option key={p.id} value={p.id}>{p.nameHe}{p.active ? "" : " (לא פעיל)"}</option>
                            ))}
                            {/* A product still loading, or not in the list */}
                            {line.productId && products && !product && <option value={line.productId}>{line.name}</option>}
                          </select>
                        </Field>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                      className="flex-shrink-0 p-2 rounded-xl hover:opacity-70"
                      style={{ color: "var(--maroon)" }}
                      aria-label="הסר פריט"
                      title="הסר פריט"
                    >
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {deleted ? (
                      <>
                        <Field label="צבע"><p className="text-sm py-2" style={{ color: "var(--text)" }}>{line.color || "—"}</p></Field>
                        <Field label="מידה"><p className="text-sm py-2" style={{ color: "var(--text)" }}>{line.size || "—"}</p></Field>
                      </>
                    ) : (
                      <>
                        <Field label="צבע">
                          {product && product.colors.length > 0 ? (
                            <select className={inputCls} style={{ ...inputStyle, background: "var(--cream)" }} value={line.color} onChange={(e) => pickColor(line.key, line, e.target.value)}>
                              {!color && <option value={line.color}>{line.color || "בחרו צבע"}</option>}
                              {product.colors.map((c) => <option key={c.nameHe} value={c.nameHe}>{c.nameHe}</option>)}
                            </select>
                          ) : (
                            <p className="text-sm py-2" style={{ color: "var(--text-muted)" }}>—</p>
                          )}
                        </Field>
                        <Field label="מידה">
                          {sizes.length > 0 ? (
                            <select className={inputCls} style={{ ...inputStyle, background: "var(--cream)" }} value={line.size} onChange={(e) => updateLine(line.key, { size: e.target.value })}>
                              {!sizes.some((s) => s.size === line.size) && <option value={line.size}>{line.size || "בחרו מידה"}</option>}
                              {sizes.map((s) => <option key={s.size} value={s.size}>{s.size} (במלאי {s.stock})</option>)}
                            </select>
                          ) : (
                            <input className={inputCls} style={{ ...inputStyle, background: "var(--cream)" }} value={line.size} onChange={(e) => updateLine(line.key, { size: e.target.value })} />
                          )}
                        </Field>
                      </>
                    )}
                    <Field label="כמות">
                      <input className={inputCls} style={{ ...inputStyle, background: "var(--cream)" }} type="number" min={1} max={100} step={1} inputMode="numeric" value={line.quantity}
                        onChange={(e) => updateLine(line.key, { quantity: Math.max(1, Math.min(100, Math.floor(Number(e.target.value) || 1))) })} />
                    </Field>
                    <Field label="מחיר ליחידה (₪)">
                      <input className={inputCls} style={{ ...inputStyle, background: "var(--cream)" }} type="number" min={0} step="any" inputMode="decimal" value={line.price}
                        onChange={(e) => updateLine(line.key, { price: e.target.value === "" ? 0 : Number(e.target.value) })} />
                    </Field>
                  </div>
                </div>
              );
            })}
            <button type="button" onClick={addLine} className="self-start px-4 py-2 rounded-xl text-sm font-bold border hover:opacity-70" style={{ borderColor: "var(--text)", color: "var(--text)" }}>
              + הוסף פריט
            </button>
            {order.status === "paid" && (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                ההזמנה שולמה, לכן המלאי יתעדכן לפי השינוי: פריט שהוסר או הוקטן חוזר למלאי, ופריט שנוסף או הוגדל יורד מהמלאי. אם אין מספיק מלאי — השמירה תיעצר.
              </p>
            )}
          </section>

          {/* Totals */}
          <section className="flex flex-col gap-3">
            <h3 className="font-bold text-sm" style={{ color: "var(--text)" }}>סכומים</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="הנחת קופון (₪)">
                <input className={inputCls} style={inputStyle} type="number" min={0} step="any" inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value === "" ? 0 : Number(e.target.value))} />
              </Field>
              <div className="flex flex-col gap-1 text-right text-sm" style={{ color: "var(--text-muted)" }}>
                <span>פריטים: ₪{round(linesTotal)}</span>
                {appliedDiscount > 0 && <span>הנחה: −₪{round(appliedDiscount)}</span>}
                <span>משלוח: ₪{round(delivery || 0)}</span>
                <span className="font-extrabold text-base" style={{ color: "var(--text)" }}>סה״כ: ₪{newTotal}</span>
              </div>
            </div>
            {totalChanged && (
              <p className="text-xs px-3 py-2 rounded-xl" style={{ background: "#fffbeb", color: "#92400e", border: "1px solid #f59e0b" }}>
                הסכום משתנה מ-₪{order.total} ל-₪{newTotal}. העריכה לא מחייבת ולא מזכה את הלקוח — את ההפרש יש לגבות או להחזיר ב-Hyp.
              </p>
            )}
          </section>
        </div>

        <div className="px-5 py-4 border-t flex flex-col gap-2" style={{ borderColor: "var(--border)" }}>
          {error && <p role="alert" className="text-sm text-right" style={{ color: "var(--maroon)" }}>{error}</p>}
          <div className="flex gap-3">
            <button onClick={onClose} disabled={saving} className="flex-1 py-3 rounded-xl border font-medium hover:opacity-70" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>ביטול</button>
            <button onClick={save} disabled={saving || !products} className="flex-1 py-3 rounded-xl font-bold disabled:opacity-50" style={{ background: "var(--text)", color: "var(--cream)" }}>
              {saving ? "שומר..." : "שמור שינויים"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
