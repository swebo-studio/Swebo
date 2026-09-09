"use client";
import { useState } from "react";

export default function NewsletterSection() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone) { setError("נא להזין מספר טלפון"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
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

  if (coupon) {
    return (
      <section role="status" aria-labelledby="newsletter-ready" className="rounded-2xl border p-8 text-center" style={{ background: "var(--cream-dark)", borderColor: "var(--border)" }}>
        <h2 id="newsletter-ready" className="text-xl font-extrabold mb-2" style={{ color: "var(--text)" }}>הקופון שלך מוכן!</h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>השתמש בקוד הזה בעת התשלום לקבלת 5% הנחה:</p>
        <p
          className="text-2xl font-extrabold tracking-[4px] px-6 py-4 rounded-2xl border-2 border-dashed inline-block mb-5"
          style={{ borderColor: "var(--maroon)", color: "var(--maroon)", background: "var(--cream)" }}
        >
          <span className="sr-only">קוד הקופון: </span>{coupon}
        </p>
        <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>שלחנו גם הודעת SMS למספר {phone}</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="newsletter-title" className="rounded-2xl border p-8" style={{ background: "var(--cream-dark)", borderColor: "var(--border)" }}>
      <div className="text-center mb-5">
        <h2 id="newsletter-title" className="text-xl font-extrabold mb-1" style={{ color: "var(--text)" }}>הצטרף לרשימת התפוצה</h2>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>קבל <strong>5% הנחה</strong> על הזמנתך הראשונה</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm mx-auto">
        <label htmlFor="newsletter-phone" className="text-sm text-right" style={{ color: "var(--text-muted)" }}>
          מספר טלפון (לקבלת הקופון ב-SMS)
        </label>
        <input
          id="newsletter-phone"
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="050-0000000"
          required
          aria-describedby={error ? "newsletter-error" : undefined}
          aria-invalid={error ? true : undefined}
          className="w-full px-4 py-3 rounded-xl border text-right text-sm"
          style={{ background: "var(--cream)", borderColor: "var(--border)", color: "var(--text)" }}
        />
        {error && <p id="newsletter-error" role="alert" className="text-xs text-center" style={{ color: "var(--maroon)" }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl font-bold transition-opacity disabled:opacity-50"
          style={{ background: "var(--text)", color: "var(--cream)" }}
        >
          {loading ? "רגע..." : (
            <span className="flex items-center justify-center gap-2">
              קבל קופון 5%
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </span>
          )}
        </button>
        <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
          ההרשמה כפופה ל
          <a href="/privacy" className="underline mx-1">מדיניות פרטיות</a>
        </p>
      </form>
    </section>
  );
}
