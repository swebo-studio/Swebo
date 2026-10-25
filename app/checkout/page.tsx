"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useCart } from "@/components/CartProvider";
import Header from "@/components/Header";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { promotionPricing } from "@/lib/cartPricing";
import { SELF_PICKUP_LOCATION, SELF_PICKUP_DEFAULT_TEXT } from "@/lib/selfPickup";
import { scopeCoversDelivery, freeShippingLabel, isFreeShippingScope, type FreeShippingScope } from "@/lib/shippingScope";

const EpostMap = dynamic(() => import("@/components/EpostMap"), { ssr: false });

// Rendered through the EPOST map so self-pickup looks the same as a locker
const SELF_PICKUP_POINT = { n_code: 0, street: "", house: 0, ...SELF_PICKUP_LOCATION };
const noop = () => {};

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
  const { items, promotions } = useCart();
  const promotionRewards = promotions.applied;
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("home");
  const [couponInput, setCouponInput] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponDiscountAmount, setCouponDiscountAmount] = useState(0);
  /** Set when the redeemed code is a free-shipping coupon: which delivery it covers */
  const [couponFreeShipping, setCouponFreeShipping] = useState<FreeShippingScope | null>(null);
  /** A content creator's code: it is recorded on the order even when a promotion keeps it from discounting */
  const [couponCollab, setCouponCollab] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // EPOST state
  const [epostCity, setEpostCity] = useState("");
  const [epostPoints, setEpostPoints] = useState<EpostPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<EpostPoint | null>(null);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [pointsError, setPointsError] = useState("");

  const [selfPickupText, setSelfPickupText] = useState(SELF_PICKUP_DEFAULT_TEXT);
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((cfg: Record<string, string>) => { if (cfg["selfPickup.text"]?.trim()) setSelfPickupText(cfg["selfPickup.text"]); })
      .catch(() => {});
  }, []);

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
    if (data.valid && discountAlreadyActive && !data.collab) {
      setCouponError("בסל כבר יש הנחה פעילה — לא ניתן לשלב איתה קופון");
    } else if (data.valid) {
      setCouponCollab(data.collab === true);
      setCouponDiscount(data.discountPct ?? 0);
      setCouponDiscountAmount(data.discountAmount ?? 0);
      setCouponFreeShipping(isFreeShippingScope(data.freeShipping) ? data.freeShipping : null);
    } else {
      setCouponError(data.error || "קוד לא תקין");
      setCouponCollab(false);
      setCouponDiscount(0);
      setCouponDiscountAmount(0);
      setCouponFreeShipping(null);
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

  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", floor: "", apartment: "", city: "" });

  const pricing = promotionPricing(items, promotionRewards);
  // A free-shipping promotion zeroes only the delivery it covers — the same rule the order API applies
  const promoFreesDelivery = (mode: DeliveryMode) => scopeCoversDelivery(pricing.freeShippingScope, mode);
  const deliveryPrice = (mode: DeliveryMode) => (promoFreesDelivery(mode) ? 0 : mode === "home" ? 40 : mode === "epost" ? 25 : 0);
  const baseDelivery = deliveryPrice(deliveryMode);

  const cartLevelDiscount = pricing.itemSubtotal - pricing.subtotal;
  // A promotion that already cuts the price blocks the coupon box. Free
  // shipping on its own doesn't — the shopper can still redeem a code.
  const discountAlreadyActive = pricing.savings > 0;
  const couponSavings = discountAlreadyActive ? 0 : couponDiscountAmount > 0
    ? Math.min(couponDiscountAmount, pricing.subtotal)
    : couponDiscount > 0 ? Math.round(pricing.subtotal * couponDiscount / 100) : 0;
  const finalSubtotal = pricing.subtotal - couponSavings;
  // A free-shipping coupon only counts where it covers this delivery and there is a fee to cover
  const shippingCoupon = discountAlreadyActive ? null : couponFreeShipping;
  const couponFreesDelivery = (mode: DeliveryMode) => scopeCoversDelivery(shippingCoupon, mode) && deliveryPrice(mode) > 0;
  const shippingCouponSavings = couponFreesDelivery(deliveryMode) ? baseDelivery : 0;
  const delivery = baseDelivery - shippingCouponSavings;
  const total = finalSubtotal + delivery;
  const couponApplied = couponSavings > 0 || shippingCoupon !== null || couponCollab;

  // Drop anything already typed/applied the moment a promotion takes over —
  // except a creator's code, which still credits the creator
  useEffect(() => {
    if (!discountAlreadyActive || couponCollab) return;
    setCouponInput("");
    setCouponDiscount(0);
    setCouponDiscountAmount(0);
    setCouponFreeShipping(null);
    setCouponError("");
  }, [discountAlreadyActive, couponCollab]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return;

    if (deliveryMode === "epost" && !selectedPoint) {
      setError("יש לבחור נקודת איסוף");
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
          couponCode: couponCollab || (!discountAlreadyActive && (couponDiscount > 0 || couponDiscountAmount > 0 || shippingCouponSavings > 0)) ? couponInput.trim().toUpperCase() : undefined,
          customer: {
            name: form.name,
            email: form.email,
            phone: form.phone,
            address,
            city,
            floor: deliveryMode === "home" ? form.floor.trim() || undefined : undefined,
            apartment: deliveryMode === "home" ? form.apartment.trim() || undefined : undefined,
          },
          delivery,
          deliveryMode,
          pudoCodeDestination: deliveryMode === "epost" ? selectedPoint!.n_code : undefined,
          pudoPointName: deliveryMode === "epost" ? selectedPoint!.name : undefined,
          cartItems: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            size: i.size,
            color: i.color,
            price: i.price,
          })),
        }),
      });

      if (!orderRes.ok) {
        const errData = await orderRes.json().catch(() => ({}));
        throw new Error(errData.error || "שגיאה ביצירת הזמנה");
      }
      const order = await orderRes.json();

      const payRes = await fetch("/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      const payData = await payRes.json();

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
        <main id="main-content" className="max-w-xl mx-auto px-4 py-20 text-center">
          <p className="text-xl mb-6" style={{ color: "var(--text-muted)" }}>העגלה ריקה</p>
          <a href="/" className="underline" style={{ color: "var(--text)" }}>חזור לחנות</a>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main id="main-content" className="max-w-xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-extrabold mb-8 text-right" style={{ color: "var(--text)" }}>
          פרטי הזמנה
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Delivery mode toggle */}
          <div role="group" aria-label="אופן קבלת ההזמנה" className="rounded-2xl border p-1 flex overflow-hidden w-full" style={{ borderColor: "var(--border)" }}>
            {([
              { val: "home",  line1: "משלוח לבית", line2: "₪40" },
              { val: "epost", line1: "נקודות איסוף", line2: "₪25" },
              { val: "self",  line1: "איסוף עצמי",  line2: "חינם" },
            ] as { val: DeliveryMode; line1: string; line2: string }[]).map(({ val, line1, line2 }) => (
              <button
                key={val}
                type="button"
                onClick={() => { setDeliveryMode(val); setError(""); }}
                aria-pressed={deliveryMode === val}
                aria-label={`${line1}, ${couponFreesDelivery(val) ? "חינם עם הקופון" : promoFreesDelivery(val) ? "חינם במבצע" : line2}`}
                className="flex-1 min-w-0 py-2.5 rounded-xl transition-all flex flex-col items-center gap-0.5 px-1"
                style={{
                  background: deliveryMode === val ? "var(--text)" : "transparent",
                  color: deliveryMode === val ? "var(--cream)" : "var(--text-muted)",
                }}
              >
                <span className="text-xs font-bold leading-tight text-center">{line1}</span>
                <span className="text-xs leading-tight">{couponFreesDelivery(val) || promoFreesDelivery(val) ? <><s className="opacity-60">{line2}</s> חינם</> : line2}</span>
              </button>
            ))}
          </div>

          {/* Common fields */}
          {[
            { name: "name",  label: "שם מלא",  type: "text",  placeholder: "ישראל ישראלי",       req: true, autoComplete: "name" },
            { name: "email", label: "אימייל",   type: "email", placeholder: "example@email.com",  req: true, autoComplete: "email" },
            { name: "phone", label: "טלפון",    type: "tel",   placeholder: "050-0000000",        req: true, autoComplete: "tel" },
          ].map((field) => (
            <div key={field.name} className="flex flex-col gap-1">
              <label htmlFor={`checkout-${field.name}`} className="text-sm font-medium text-right" style={{ color: "var(--text-muted)" }}>{field.label}</label>
              <input
                id={`checkout-${field.name}`}
                type={field.type}
                name={field.name}
                autoComplete={field.autoComplete}
                value={form[field.name as keyof typeof form]}
                onChange={handleChange}
                placeholder={field.placeholder}
                required={field.req}
                className="w-full px-4 py-3 rounded-xl border text-right"
                style={inputStyle}
              />
            </div>
          ))}

          {/* Home delivery address fields */}
          {deliveryMode === "home" && (
            <>
              <div className="flex flex-col gap-1">
                <label htmlFor="checkout-address" className="text-sm font-medium text-right" style={{ color: "var(--text-muted)" }}>רחוב ומספר בית</label>
                <input
                  id="checkout-address"
                  type="text"
                  name="address"
                  autoComplete="street-address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="רחוב הרצל 1"
                  required
                  className="w-full px-4 py-3 rounded-xl border text-right"
                  style={inputStyle}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="checkout-floor" className="text-sm font-medium text-right" style={{ color: "var(--text-muted)" }}>קומה (אופציונלי)</label>
                  <input
                    id="checkout-floor"
                    type="text"
                    name="floor"
                    value={form.floor}
                    onChange={handleChange}
                    placeholder="3"
                    className="w-full px-4 py-3 rounded-xl border text-right"
                    style={inputStyle}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="checkout-apartment" className="text-sm font-medium text-right" style={{ color: "var(--text-muted)" }}>דירה (אופציונלי)</label>
                  <input
                    id="checkout-apartment"
                    type="text"
                    name="apartment"
                    value={form.apartment}
                    onChange={handleChange}
                    placeholder="5"
                    className="w-full px-4 py-3 rounded-xl border text-right"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="checkout-city" className="text-sm font-medium text-right" style={{ color: "var(--text-muted)" }}>עיר</label>
                <input
                  id="checkout-city"
                  type="text"
                  name="city"
                  autoComplete="address-level2"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="תל אביב"
                  required
                  className="w-full px-4 py-3 rounded-xl border text-right"
                  style={inputStyle}
                />
              </div>
            </>
          )}

          {/* EPOST pickup point selector */}
          {deliveryMode === "epost" && (
            <div className="rounded-2xl border p-4 flex flex-col gap-3 w-full overflow-hidden" style={{ borderColor: "var(--border)" }}>
              <p className="text-sm font-bold text-right" style={{ color: "var(--text)" }}>בחר נקודת איסוף</p>

              <div className="flex gap-2 w-full min-w-0">
                <label htmlFor="epost-city" className="sr-only">עיר לחיפוש נקודת איסוף</label>
                <input
                  id="epost-city"
                  type="text"
                  value={epostCity}
                  onChange={(e) => setEpostCity(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); searchEpostPoints(); } }}
                  placeholder="הקלד שם עיר..."
                  className="flex-1 min-w-0 px-4 py-3 rounded-xl border text-right"
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={searchEpostPoints}
                  disabled={loadingPoints}
                  className="px-5 py-3 rounded-xl font-medium text-sm transition-opacity disabled:opacity-50 flex-shrink-0"
                  style={{ background: "var(--text)", color: "var(--cream)" }}
                >
                  {loadingPoints ? "..." : "חפש"}
                </button>
              </div>

              {pointsError && (
                <p role="alert" className="text-sm text-right" style={{ color: "var(--maroon)" }}>{pointsError}</p>
              )}

              {/* Selected point confirmation */}
              {selectedPoint && (
                <div role="status" className="rounded-xl p-3 border-2 text-right" style={{ borderColor: "var(--green)", background: "#e8f5e9" }}>
                  <p className="text-xs font-bold mb-0.5 flex items-center gap-1" style={{ color: "var(--green)" }}><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>נקודה נבחרה</p>
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
                        aria-pressed={selectedPoint?.n_code === point.n_code}
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

          {/* Self pickup location + instructions */}
          {deliveryMode === "self" && (
            <div className="rounded-2xl border p-4 flex flex-col gap-3 w-full overflow-hidden" style={{ borderColor: "var(--border)" }}>
              <div className="text-right">
                <p className="text-sm font-bold" style={{ color: "var(--text)" }}>מקום האיסוף</p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>{SELF_PICKUP_LOCATION.name}, {SELF_PICKUP_LOCATION.city}</p>
              </div>

              <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)", height: 220 }}>
                <EpostMap points={[SELF_PICKUP_POINT]} selected={SELF_PICKUP_POINT} onSelect={noop} />
              </div>

              <div className="flex gap-2 justify-end">
                <a
                  href={`https://waze.com/ul?ll=${SELF_PICKUP_LOCATION.lat},${SELF_PICKUP_LOCATION.lng}&navigate=yes`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl border text-xs font-medium transition-opacity hover:opacity-70"
                  style={{ borderColor: "var(--border)", color: "var(--text)" }}
                >
                  ניווט ב-Waze
                </a>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${SELF_PICKUP_LOCATION.lat},${SELF_PICKUP_LOCATION.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl border text-xs font-medium transition-opacity hover:opacity-70"
                  style={{ borderColor: "var(--border)", color: "var(--text)" }}
                >
                  Google Maps
                </a>
              </div>

              <p className="text-sm text-right whitespace-pre-line leading-relaxed" style={{ color: "var(--text)" }}>
                {selfPickupText}
              </p>
            </div>
          )}

          {/* Coupon */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={applyCoupon}
              disabled={validatingCoupon || couponApplied}
              className="px-4 py-3 rounded-xl border font-medium text-sm transition-opacity disabled:opacity-50 flex-shrink-0"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            >
              {validatingCoupon ? "..." : couponApplied ? <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> : "הפעל"}
            </button>
            <label htmlFor="coupon-code" className="sr-only">קוד קופון</label>
            <input
              id="coupon-code"
              type="text"
              value={couponInput}
              onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponCollab(false); setCouponDiscount(0); setCouponDiscountAmount(0); setCouponFreeShipping(null); setCouponError(""); }}
              placeholder="קוד קופון (אופציונלי)"
              disabled={couponApplied}
              aria-describedby={couponError ? "coupon-error" : undefined}
              aria-invalid={couponError ? true : undefined}
              className="flex-1 px-4 py-3 rounded-xl border text-right text-sm disabled:cursor-not-allowed"
              style={{
                background: "var(--cream-dark)",
                borderColor: couponApplied ? "var(--green)" : "var(--border)",
                color: "var(--text)",
              }}
            />
          </div>
          {discountAlreadyActive && !couponApplied && !couponError && (
            <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>בסל כבר יש הנחה פעילה, ולכן קופון הנחה לא יצטרף אליה</p>
          )}
          {couponCollab && couponSavings === 0 && !shippingCoupon && (
            <p role="status" className="text-xs font-bold flex items-center justify-center gap-1 flex-wrap" style={{ color: "var(--green)" }}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> הקוד {couponInput} נרשם בהזמנה{discountAlreadyActive ? " — ההנחה שכבר בסל נשמרת" : ""}
            </p>
          )}
          {couponError && <p id="coupon-error" role="alert" className="text-xs text-center" style={{ color: "var(--maroon)" }}>{couponError}</p>}
          {couponSavings > 0 && (
            <p role="status" className="text-xs font-bold flex items-center justify-center gap-1 flex-wrap" style={{ color: "var(--green)" }}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> קופון פעיל –{" "}
              {couponDiscountAmount > 0 ? `₪${couponDiscountAmount} הנחה` : `${couponDiscount}% הנחה`}
              {" "}(חיסכון ₪{couponSavings})
            </p>
          )}
          {shippingCoupon && (
            shippingCouponSavings > 0 ? (
              <p role="status" className="text-xs font-bold flex items-center justify-center gap-1 flex-wrap" style={{ color: "var(--green)" }}>
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> קופון פעיל –{" "}
                {freeShippingLabel(shippingCoupon)} (חיסכון ₪{shippingCouponSavings})
              </p>
            ) : (
              <p role="status" className="text-xs text-center font-medium" style={{ color: "var(--text-muted)" }}>
                {deliveryMode === "self" || baseDelivery === 0
                  ? "המשלוח כבר חינם — הקופון לא ינוצל בהזמנה הזו"
                  : `הקופון תקף ל${shippingCoupon === "home" ? "משלוח עד הבית" : "נקודת איסוף"} בלבד — בחרו אותו למעלה כדי ליהנות ממשלוח חינם`}
              </p>
            )
          )}

          {/* Active promotions */}
          {promotionRewards.length > 0 && (
            <div className="rounded-xl border p-3 flex flex-col gap-1" style={{ borderColor: "var(--green)", background: "#e8f5e9" }}>
              <p className="text-xs font-bold text-right mb-1" style={{ color: "var(--green)" }}>מבצעים פעילים</p>
              {promotionRewards.map((r, i) => (
                <p key={i} className="flex items-start gap-1 text-xs text-right" style={{ color: "var(--green)" }}>
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className="flex-shrink-0 mt-px" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>
                    {r.promotionName}
                    {r.type === "free_shipping" && ` — ${freeShippingLabel(isFreeShippingScope(r.shippingScope) ? r.shippingScope : "all")}`}
                    {r.type === "cart_discount" && (r.discountAmount ? ` — ₪${r.discountAmount} הנחה על הסל` : ` — ${r.discountPct}% הנחה על הסל`)}
                    {r.type === "product_discount" && ` — ${r.discountPct === 100 ? "חינם" : `${r.discountPct}% הנחה`} על ${r.productName}`}
                    {r.type === "bundle" && ` — ${r.buyQuantity} פריטים ב-₪${r.bundlePrice}`}
                    {r.type === "buy_get" && ` — ${r.getQuantity === 1 ? "פריט" : `${r.getQuantity} פריטים`} ${r.discountPct === 100 ? "חינם" : `ב-${r.discountPct}% הנחה`}`}
                  </span>
                </p>
              ))}
            </div>
          )}

          {/* Order summary */}
          <div className="mt-4 p-5 rounded-2xl border text-right" style={{ background: "var(--cream-dark)", borderColor: "var(--border)" }}>
            <h2 className="font-bold mb-1" style={{ color: "var(--text)" }}>סיכום הזמנה</h2>
            <Link
              href="/yeshuvim-meruhakim"
              target="_blank"
              className="text-xs underline underline-offset-2 hover:opacity-70 transition-opacity block mb-3"
              style={{ color: "var(--text-muted)" }}
            >
              יישובים מרוחקים
            </Link>
            {items.map((item, index) => {
              const line = pricing.lines[index];
              const discounted = line.discountedUnits > 0;
              return (
                <div key={`${item.productId}-${item.size}-${item.color ?? ""}`} className="flex justify-between text-sm mb-1" style={{ color: "var(--text-muted)" }}>
                  <span className="flex items-center gap-1.5">
                    {discounted && <span className="line-through">₪{line.rawTotal}</span>}
                    <span style={discounted ? { color: "var(--green)", fontWeight: 700 } : undefined}>₪{line.total}</span>
                  </span>
                  <span>
                    {item.nameHe} × {item.quantity} ({item.color ? `${item.color} · ` : ""}מידה {item.size})
                    {discounted && line.discountedUnits < item.quantity && ` — ההנחה על ${line.discountedUnits}`}
                  </span>
                </div>
              );
            })}
            {cartLevelDiscount > 0 && (
              <div className="flex justify-between text-sm mt-2 font-bold" style={{ color: "var(--green)" }}>
                <span>−₪{cartLevelDiscount}</span>
                <span>הנחת מבצע על הסל</span>
              </div>
            )}
            {couponSavings > 0 && (
              <div className="flex justify-between text-sm mt-2 font-bold" style={{ color: "var(--green)" }}>
                <span>−₪{couponSavings}</span>
                <span>הנחת קופון</span>
              </div>
            )}
            <div className="flex justify-between text-sm mt-2" style={{ color: "var(--text-muted)" }}>
              <span style={{ color: (promoFreesDelivery(deliveryMode) || shippingCouponSavings > 0) ? "var(--green)" : "inherit" }}>
                {deliveryMode === "self" ? "חינם" : shippingCouponSavings > 0 ? <><s className="opacity-60">₪{baseDelivery}</s> חינם</> : promoFreesDelivery(deliveryMode) ? "חינם 🎉" : `₪${baseDelivery}`}
              </span>
              <span>
                {deliveryMode === "home" ? "משלוח" : deliveryMode === "epost" ? "נקודות איסוף" : "איסוף עצמי"}
              </span>
            </div>
            <div className="flex justify-between font-extrabold text-xl mt-3 pt-3 border-t" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
              <span>₪{total}</span>
              <span>סה&quot;כ</span>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-center text-sm font-medium" style={{ color: "var(--maroon)" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl font-bold text-lg transition-opacity disabled:opacity-60"
            style={{ background: "var(--text)", color: "var(--cream)" }}
          >
            {loading ? "מעבד..." : "לשלב הבא"}
          </button>
        </form>
      </main>
    </>
  );
}
