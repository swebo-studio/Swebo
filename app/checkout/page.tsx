"use client";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import Header from "@/components/Header";
import { useRouter } from "next/navigation";

export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [wantsDelivery, setWantsDelivery] = useState(true);
  const [couponInput, setCouponInput] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);

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

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
  });

  const delivery = wantsDelivery ? 40 : 0;
  const discount = couponDiscount > 0 ? Math.round(totalPrice * couponDiscount / 100) : 0;
  const total = totalPrice - discount + delivery;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return;
    setLoading(true);
    setError("");

    try {
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          couponCode: couponDiscount > 0 ? couponInput.trim().toUpperCase() : undefined,
          customer: {
            name: form.name,
            email: form.email,
            phone: form.phone,
            address: wantsDelivery ? form.address : "איסוף עצמי",
            city: wantsDelivery ? form.city : "איסוף עצמי",
          },
          delivery,
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

      if (payData.paymentUrl) {
        window.location.href = payData.paymentUrl;
      } else {
        router.push(`/order/${order.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה, נסה שנית");
    } finally {
      setLoading(false);
    }
  }

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

          {/* Delivery toggle */}
          <div
            className="rounded-2xl border p-1 flex text-sm font-bold overflow-hidden"
            style={{ borderColor: "var(--border)" }}
          >
            {[
              { val: true,  label: "משלוח עד הבית — ₪40" },
              { val: false, label: "איסוף עצמי — חינם" },
            ].map(({ val, label }) => (
              <button
                key={String(val)}
                type="button"
                onClick={() => setWantsDelivery(val)}
                className="flex-1 py-3 rounded-xl transition-all"
                style={{
                  background: wantsDelivery === val ? "var(--text)" : "transparent",
                  color: wantsDelivery === val ? "var(--cream)" : "var(--text-muted)",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Common fields */}
          {[
            { name: "name",  label: "שם מלא",  type: "text",  placeholder: "ישראל ישראלי",    req: true },
            { name: "email", label: "אימייל",   type: "email", placeholder: "example@email.com", req: true },
            { name: "phone", label: "טלפון",    type: "tel",   placeholder: "050-0000000",     req: true },
          ].map((field) => (
            <div key={field.name} className="flex flex-col gap-1">
              <label className="text-sm font-medium text-right" style={{ color: "var(--text-muted)" }}>
                {field.label}
              </label>
              <input
                type={field.type}
                name={field.name}
                value={form[field.name as keyof typeof form]}
                onChange={handleChange}
                placeholder={field.placeholder}
                required={field.req}
                className="w-full px-4 py-3 rounded-xl border text-right outline-none"
                style={{ background: "var(--cream-dark)", borderColor: "var(--border)", color: "var(--text)" }}
              />
            </div>
          ))}

          {/* Delivery-only fields */}
          {wantsDelivery && (
            <>
              {[
                { name: "address", label: "כתובת", placeholder: "רחוב הרצל 1, דירה 5" },
                { name: "city",    label: "עיר",    placeholder: "תל אביב" },
              ].map((field) => (
                <div key={field.name} className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-right" style={{ color: "var(--text-muted)" }}>
                    {field.label}
                  </label>
                  <input
                    type="text"
                    name={field.name}
                    value={form[field.name as keyof typeof form]}
                    onChange={handleChange}
                    placeholder={field.placeholder}
                    required
                    className="w-full px-4 py-3 rounded-xl border text-right outline-none"
                    style={{ background: "var(--cream-dark)", borderColor: "var(--border)", color: "var(--text)" }}
                  />
                </div>
              ))}
            </>
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
          {couponDiscount > 0 && <p className="text-xs text-center font-bold" style={{ color: "var(--green)" }}>✓ קופון פעיל – {couponDiscount}% הנחה (חיסכון ₪{discount})</p>}

          {/* Order summary */}
          <div
            className="mt-4 p-5 rounded-2xl border text-right"
            style={{ background: "var(--cream-dark)", borderColor: "var(--border)" }}
          >
            <h2 className="font-bold mb-3" style={{ color: "var(--text)" }}>סיכום הזמנה</h2>
            {items.map((item) => (
              <div key={`${item.productId}-${item.size}-${item.color ?? ""}`} className="flex justify-between text-sm mb-1" style={{ color: "var(--text-muted)" }}>
                <span>₪{item.price * item.quantity}</span>
                <span>
                  {item.nameHe} × {item.quantity}
                  {" "}({item.color ? `${item.color} · ` : ""}מידה {item.size})
                </span>
              </div>
            ))}
            <div className="flex justify-between text-sm mt-2" style={{ color: "var(--text-muted)" }}>
              <span>{delivery === 0 ? "חינם" : `₪${delivery}`}</span>
              <span>{wantsDelivery ? "משלוח" : "איסוף עצמי"}</span>
            </div>
            <div
              className="flex justify-between font-extrabold text-xl mt-3 pt-3 border-t"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            >
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
            {loading ? "מעבד..." : `שלם ₪${total} דרך GROW`}
          </button>
        </form>
      </main>
    </>
  );
}
