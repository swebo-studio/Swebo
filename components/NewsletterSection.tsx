"use client";
import { useState } from "react";

export default function NewsletterSection() {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [error, setError] = useState("");
  const waNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone && !email) { setError("נא להזין טלפון או אימייל"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone || null, email: email || null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "שגיאה, נסה שנית"); return; }
      setCoupon(data.code);
    } catch {
      setError("שגיאה, נסה שנית");
    } finally {
      setLoading(false);
    }
  }

  const waHref = coupon && waNumber
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent(`הנה קוד ההנחה שלי: ${coupon}`)}`
    : null;

  if (coupon) {
    return (
      <section className="rounded-2xl border p-8 text-center" style={{ background: "var(--cream-dark)", borderColor: "var(--border)" }}>
        <div className="text-4xl mb-3">🎉</div>
        <h3 className="text-xl font-extrabold mb-2" style={{ color: "var(--text)" }}>הקופון שלך מוכן!</h3>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>השתמש בקוד הזה בעת התשלום לקבלת 5% הנחה:</p>
        <div
          className="text-2xl font-extrabold tracking-[4px] px-6 py-4 rounded-2xl border-2 border-dashed inline-block mb-5"
          style={{ borderColor: "var(--maroon)", color: "var(--maroon)", background: "var(--cream)" }}
        >
          {coupon}
        </div>
        {waHref && (
          <div className="mt-2">
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-sm"
              style={{ background: "#25D366" }}
            >
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              שלח לי את הקוד בוואטסאפ
            </a>
          </div>
        )}
        {email && <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>שלחנו גם אימייל ל-{email}</p>}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border p-8" style={{ background: "var(--cream-dark)", borderColor: "var(--border)" }}>
      <div className="text-center mb-5">
        <h3 className="text-xl font-extrabold mb-1" style={{ color: "var(--text)" }}>הצטרף לרשימת התפוצה</h3>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>קבל <strong>5% הנחה</strong> על הזמנתך הראשונה</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm mx-auto">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="מספר טלפון (לקבלה בוואטסאפ)"
          className="w-full px-4 py-3 rounded-xl border text-right outline-none text-sm"
          style={{ background: "var(--cream)", borderColor: "var(--border)", color: "var(--text)" }}
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="אימייל (אופציונלי)"
          className="w-full px-4 py-3 rounded-xl border text-right outline-none text-sm"
          style={{ background: "var(--cream)", borderColor: "var(--border)", color: "var(--text)" }}
        />
        {error && <p className="text-xs text-center" style={{ color: "var(--maroon)" }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl font-bold transition-opacity disabled:opacity-50"
          style={{ background: "var(--text)", color: "var(--cream)" }}
        >
          {loading ? "רגע..." : "קבל קופון 5% ←"}
        </button>
        <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
          ההרשמה כפופה ל
          <a href="/privacy" className="underline mx-1">מדיניות פרטיות</a>
        </p>
      </form>
    </section>
  );
}
