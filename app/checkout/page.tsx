"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useCart } from "@/components/CartProvider";
import Header from "@/components/Header";
import { useRouter } from "next/navigation";
import type { AppliedReward } from "@/lib/promotions";

const EpostMap = dynamic(() => import("@/components/EpostMap"), { ssr: false });

type DeliveryMode = "home" | "epost" | "self";

interface EpostPoint {
  n_code: number;
  name: string;
  city: string;
  street: string;
  house: number;
  remarks?: string;
  type?: string;
  lat?: number; lng?: number;
  latitude?: number; longitude?: number;
  x_wgs84?: number; y_wgs84?: number;
  x?: number; y?: number;
}

export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("home");
  const [couponInput, setCouponInput] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [promotionRewards, setPromotionRewards] = useState<AppliedReward[]>([]);

  // EPOST state
  const [epostCity, setEpostCity] = useState("");
  const [epostPoints, setEpostPoints] = useState<EpostPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<EpostPoint | null>(null);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [pointsError, setPointsError] = useState("");

  useEffect(() => {
    if (items.length === 0) { setPromotionRewards([]); return; }
    fetch("/api/promotions/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cartItems: items.map((i) => ({ productId: i.productId, quantity: i.quantity, price: i.price })), subtotal: totalPrice }),
    }).then((r) => r.json()).then(setPromotionRewards).catch(() => {});
  }, [items, totalPrice]);

  async function applyCoupon() {
    if (!couponInput.trim()) return;
    setValidatingCoupon(true);
    setCouponError("");
    const res = await fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: couponInput.trim().toUpperCase() }),
    });
    const data = await res.json();
    setValidatingCoupon(false);
    if (data.valid) {
      setCouponDiscount(data.discountPct);
    } else {
      setCouponError(data.error || "קוד לא תקין");
      setCouponDiscount(0);
    }
  }

  async function searchEpostPoints() {
    if (!epostCity.trim()) return;
    setLoadingPoints(true);
    setPointsError("");
    setEpostPoints([]);
    setSelectedPoint(null);
    try {
      const res = await fetch(`/api/hfd/epost-points?city=${encodeURIComponent(epostCity.trim())}`);
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        setPointsError("לא נמצאו נקודות איסוף בעיר זו, נסה עיר אחרת");
      } else {
        setEpostPoints(data);
      }
    } catch {
      setPointsError("שגיאה בטעינת נקודות האיסוף");
    }
    setLoadingPoints(false);
  }

  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", city: "" });

  const hasFreeShipping = promotionRewards.some((r) => r.type === "free_shipping");
  const baseDelivery = deliveryMode === "home" ? (hasFreeShipping ? 0 : 40) : 0;

  const itemDiscountMap: Record<string, number> = {};
  promotionRewards.filter((r) => r.type === "product_discount" && r.productId && r.discountPct).forEach((r) => {
    const prev = itemDiscountMap[r.productId!] ?? 0;
    itemDiscountMap[r.productId!] = prev + r.discountPct! - (prev * r.discountPct!) / 100;
  });
  const promotionSubtotal = items.reduce((sum, item) => {
    const disc = itemDiscountMap[item.productId] ?? 0;
    const effectivePrice = disc ? Math.round(item.price * (1 - disc / 100)) : item.price;
    return sum + effectivePrice * item.quantity;
  }, 0);
  const cartDiscountPct = promotionRewards.filter((r) => r.type === "cart_discount").reduce((sum, r) => sum + (r.discountPct ?? 0), 0);
  const afterCartDiscount = cartDiscountPct > 0 ? Math.round(promotionSubtotal * (1 - Math.min(cartDiscountPct, 100) / 100)) : promotionSubtotal;
  const couponSavings = couponDiscount > 0 ? Math.round(afterCartDiscount * couponDiscount / 100) : 0;
  const finalSubtotal = afterCartDiscount - couponSavings;
  const delivery = baseDelivery;
  const total = finalSubtotal + delivery;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return;

    if (deliveryMode === "epost" && !selectedPoint) {
      setError("יש לבחור נקודת איסוף EPOST");
      return;
    }

    setLoading(true);
    setError("");

    const address = deliveryMode === "home"
      ? form.address
      : deliveryMode === "epost"
        ? `${selectedPoint!.street} ${selectedPoint!.house}, ${selectedPoint!.name}`
        : "איסוף עצמי";

    const city = deliveryMode === "home"
      ? form.city
      : deliveryMode === "epost"
        ? selectedPoint!.city
        : "איסוף עצמי";

    try {
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          couponCode: couponDiscount > 0 ? couponInput.trim().toUpperCase() : undefined,
          customer: { name: form.name, email: form.email, phone: form.phone, address, city },
          delivery,
          pudoCodeDestination: deliveryMode === "epost" ? selectedPoint!.n_code : undefined,
          cartItems: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            size: i.size,
            color: i.color,
            price: i.price,
          })),
        }),
      });

      if (!orderRes.ok) throw new Error("שגיאה ביצירת הזמנה");
      const order = await orderRes.json();

      const payRes = await fetch("/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      const payData = await payRes.json();

      clearCart();

      if (payData.error) throw new Error(`שגיאת תשלום: ${payData.error}`);

      if (payData.redirectUrl) {
        window.location.href = payData.redirectUrl;
      } else {
        router.push(`/order/${order.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה, נסה שנית");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = { background: "var(--cream-dark)", borderColor: "var(--border)", color: "var(--text)" };

  if (items.length === 0) {
    return (
      <>
        <Header />
        <main className="max-w-xl mx-auto px-4 py-20 text-center">
          <p className="text-xl mb-6" style={{ color: "var(--text-muted)" }}>העגלה ריקה</p>
          <a href="/" className="underline" style={{ color: "var(--text)" }}>חזור לחנות</a>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="max-w-xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-extrabold mb-8 text-right" style={{ color: "var(--text)" }}>
          פרטי הזמנה
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Delivery mode toggle */}
          <div className="rounded-2xl border p-1 flex text-sm font-bold overflow-hidden" style={{ borderColor: "var(--border)" }}>
            {([
              { val: "home",  label: "משלוח עד הבית — ₪40" },
              { val: "epost", label: "נקודת EPOST — חינם" },
              { val: "self",  label: "איסוף עצמי — חינם" },
            ] as { val: DeliveryMode; label: string }[]).map(({ val, label }) => (
              <button
                key={val}
                type="button"
                onClick={() => { setDeliveryMode(val); setError(""); }}
                className="flex-1 py-3 rounded-xl transition-all text-xs"
                style={{
                  background: deliveryMode === val ? "var(--text)" : "transparent",
                  color: deliveryMode === val ? "var(--cream)" : "var(--text-muted)",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Common fields */}
          {[
            { name: "name",  label: "שם מלא",  type: "text",  placeholder: "ישראל ישראלי",       req: true },
            { name: "email", label: "אימייל",   type: "email", placeholder: "example@email.com",  req: true },
            { name: "phone", label: "טלפון",    type: "tel",   placeholder: "050-0000000",        req: true },
          ].map((field) => (
            <div key={field.name} className="flex flex-col gap-1">
              <label className="text-sm font-medium text-right" style={{ color: "var(--text-muted)" }}>{field.label}</label>
              <input
                type={field.type}
                name={field.name}
                value={form[field.name as keyof typeof form]}
                onChange={handleChange}
                placeholder={field.placeholder}
                required={field.req}
                className="w-full px-4 py-3 rounded-xl border text-right outline-none"
                style={inputStyle}
              />
            </div>
          ))}

          {/* Home delivery address fields */}
          {deliveryMode === "home" && (
            <>
              {[
                { name: "address", label: "כתובת", placeholder: "רחוב הרצל 1, דירה 5" },
                { name: "city",    label: "עיר",    placeholder: "תל אביב" },
              ].map((field) => (
                <div key={field.name} className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-right" style={{ color: "var(--text-muted)" }}>{field.label}</label>
                  <input
                    type="text"
                    name={field.name}
                    value={form[field.name as keyof typeof form]}
                    onChange={handleChange}
                    placeholder={field.placeholder}
                    required
                    className="w-full px-4 py-3 rounded-xl border text-right outline-none"
                    style={inputStyle}
                  />
                </div>
              ))}
            </>
          )}

          {/* EPOST pickup point selector */}
          {deliveryMode === "epost" && (
            <div className="rounded-2xl border p-4 flex flex-col gap-3" style={{ borderColor: "var(--border)" }}>
              <p className="text-sm font-bold text-right" style={{ color: "var(--text)" }}>בחר נקודת איסוף EPOST</p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={searchEpostPoints}
                  disabled={loadingPoints}
                  className="px-4 py-3 rounded-xl font-medium text-sm transition-opacity disabled:opacity-50 flex-shrink-0"
                  style={{ background: "var(--text)", color: "var(--cream)" }}
                >
                  {loadingPoints ? "מחפש..." : "חפש"}
                </button>
                <input
                  type="text"
                  value={epostCity}
                  onChange={(e) => setEpostCity(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); searchEpostPoints(); } }}
                  placeholder="הקלד שם עיר..."
                  className="flex-1 px-4 py-3 rounded-xl border text-right outline-none"
                  style={inputStyle}
                />
              </div>

              {pointsError && (
                <p className="text-sm text-right" style={{ color: "var(--maroon)" }}>{pointsError}</p>
              )}

              {/* Selected point confirmation */}
              {selectedPoint && (
                <div className="rounded-xl p-3 border-2 text-right" style={{ borderColor: "var(--green)", background: "#e8f5e9" }}>
                  <p className="text-xs font-bold mb-0.5" style={{ color: "var(--green)" }}>✓ נקודה נבחרה</p>
                  <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{selectedPoint.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{selectedPoint.street} {selectedPoint.house}, {selectedPoint.city}</p>
                  {selectedPoint.remarks && (
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{selectedPoint.remarks}</p>
                  )}
                </div>
              )}

              {/* Points list + map */}
              {epostPoints.length > 0 && (
                <div className="flex flex-col gap-2">
                  {/* Leaflet map — only renders if HFD returns coordinates */}
                  <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)", height: 280 }}>
                    <EpostMap
                      points={epostPoints}
                      selected={selectedPoint}
                      onSelect={setSelectedPoint}
                    />
                  </div>

                  {/* Scrollable list */}
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                    {epostPoints.map((point) => (
                      <button
                        key={point.n_code}
                        type="button"
                        onClick={() => setSelectedPoint(point)}
                        className="text-right px-4 py-3 rounded-xl border transition-all"
                        style={{
                          borderColor: selectedPoint?.n_code === point.n_code ? "var(--text)" : "var(--border)",
                          background: selectedPoint?.n_code === point.n_code ? "var(--cream-dark)" : "transparent",
                        }}
                      >
                        <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{point.name}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{point.street} {point.house}{point.type ? ` — ${point.type}` : ""}</p>
                        {point.remarks && (
                          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{point.remarks}</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Coupon */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={applyCoupon}
              disabled={validatingCoupon || couponDiscount > 0}
              className="px-4 py-3 rounded-xl border font-medium text-sm transition-opacity disabled:opacity-50 flex-shrink-0"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            >
              {validatingCoupon ? "..." : couponDiscount > 0 ? "✓" : "הפעל"}
            </button>
            <input
              type="text"
              value={couponInput}
              onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponDiscount(0); setCouponError(""); }}
              placeholder="קוד קופון (אופציונלי)"
              disabled={couponDiscount > 0}
              className="flex-1 px-4 py-3 rounded-xl border text-right outline-none text-sm"
              style={{ background: "var(--cream-dark)", borderColor: couponDiscount > 0 ? "var(--green)" : "var(--border)", color: "var(--text)" }}
            />
          </div>
          {couponError && <p className="text-xs text-center" style={{ color: "var(--maroon)" }}>{couponError}</p>}
          {couponDiscount > 0 && <p className="text-xs text-center font-bold" style={{ color: "var(--green)" }}>✓ קופון פעיל – {couponDiscount}% הנחה (חיסכון ₪{couponSavings})</p>}

          {/* Active promotions */}
          {promotionRewards.length > 0 && (
            <div className="rounded-xl border p-3 flex flex-col gap-1" style={{ borderColor: "var(--green)", background: "#e8f5e9" }}>
              <p className="text-xs font-bold text-right mb-1" style={{ color: "var(--green)" }}>מבצעים פעילים 🎉</p>
              {promotionRewards.map((r, i) => (
                <p key={i} className="text-xs text-right" style={{ color: "var(--green)" }}>
                  ✓ {r.promotionName}
                  {r.type === "free_shipping" && " — משלוח חינם"}
                  {r.type === "cart_discount" && ` — ${r.discountPct}% הנחה על הסל`}
                  {r.type === "product_discount" && ` — ${r.discountPct === 100 ? "חינם" : `${r.discountPct}% הנחה`} על ${r.productName}`}
                </p>
              ))}
            </div>
          )}

          {/* Order summary */}
          <div className="mt-4 p-5 rounded-2xl border text-right" style={{ background: "var(--cream-dark)", borderColor: "var(--border)" }}>
            <h2 className="font-bold mb-3" style={{ color: "var(--text)" }}>סיכום הזמנה</h2>
            {items.map((item) => (
              <div key={`${item.productId}-${item.size}-${item.color ?? ""}`} className="flex justify-between text-sm mb-1" style={{ color: "var(--text-muted)" }}>
                <span>₪{item.price * item.quantity}</span>
                <span>{item.nameHe} × {item.quantity} ({item.color ? `${item.color} · ` : ""}מידה {item.size})</span>
              </div>
            ))}
            <div className="flex justify-between text-sm mt-2" style={{ color: "var(--text-muted)" }}>
              <span style={{ color: (hasFreeShipping && deliveryMode === "home") ? "var(--green)" : "inherit" }}>
                {deliveryMode !== "home" ? "חינם" : hasFreeShipping ? "חינם 🎉" : "₪40"}
              </span>
              <span>
                {deliveryMode === "home" ? "משלוח" : deliveryMode === "epost" ? "נקודת EPOST" : "איסוף עצמי"}
              </span>
            </div>
            <div className="flex justify-between font-extrabold text-xl mt-3 pt-3 border-t" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
              <span>₪{total}</span>
              <span>סה&quot;כ</span>
            </div>
          </div>

          {error && (
            <p className="text-center text-sm font-medium" style={{ color: "var(--maroon)" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl font-bold text-lg transition-opacity disabled:opacity-60"
            style={{ background: "var(--text)", color: "var(--cream)" }}
          >
            {loading ? "מעבד..." : `שלם ₪${total}`}
          </button>
        </form>
      </main>
    </>
  );
}
