"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDialogA11y } from "@/lib/useDialogA11y";

const STORAGE_KEY = "swebo_newsletter_popup_dismissed";
const SHOW_DELAY_MS = 1200;

export default function NewsletterPopup() {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Not on the holding page shown while the store is closed: signing up would
    // only fail, /api/newsletter being closed too, and dismissing it there would
    // hide the offer for good once the store reopens. The page marks itself —
    // the proxy reaches it by rewrite, so the pathname still reads whatever URL
    // the visitor asked for.
    if (document.querySelector("[data-site-closed]")) return;
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      // ignore (e.g. localStorage unavailable)
    }
    const timer = setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  }, []);

  useDialogA11y(open, dialogRef, close);

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
      try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    } catch {
      setError("שגיאה, נסה שנית");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={close}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="newsletter-popup-title"
        className="relative w-full max-w-sm rounded-2xl border p-6 shadow-xl"
        style={{ background: "var(--cream)", borderColor: "var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={close}
          aria-label="סגור חלון הרשמה"
          className="absolute top-3 left-3 w-8 h-8 flex items-center justify-center rounded-full hover:opacity-70 transition-opacity"
          style={{ color: "var(--text-muted)" }}
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {coupon ? (
          <div className="text-center pt-2">
            <h2 id="newsletter-popup-title" className="text-xl font-extrabold mb-2" style={{ color: "var(--text)" }}>הקופון שלך מוכן!</h2>
            <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>השתמש בקוד הזה בעת התשלום לקבלת 5% הנחה:</p>
            <p
              className="text-2xl font-extrabold tracking-[4px] px-6 py-4 rounded-2xl border-2 border-dashed inline-block mb-5"
              style={{ borderColor: "var(--maroon)", color: "var(--maroon)", background: "var(--cream-dark)" }}
            >
              <span className="sr-only">קוד הקופון: </span>{coupon}
            </p>
            <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>שלחנו גם הודעת SMS למספר {phone}</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-5 pt-2">
              <h2 id="newsletter-popup-title" className="text-xl font-extrabold mb-1" style={{ color: "var(--text)" }}>הצטרף לרשימת התפוצה</h2>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>קבל <strong>5% הנחה</strong> על הזמנתך הראשונה</p>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <label htmlFor="newsletter-popup-phone" className="text-sm text-right" style={{ color: "var(--text-muted)" }}>
                מספר טלפון (לקבלת הקופון ב-SMS)
              </label>
              <input
                id="newsletter-popup-phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="050-0000000"
                required
                aria-describedby={error ? "newsletter-popup-error" : undefined}
                aria-invalid={error ? true : undefined}
                className="w-full px-4 py-3 rounded-xl border text-right text-sm"
                style={{ background: "var(--cream-dark)", borderColor: "var(--border)", color: "var(--text)" }}
              />
              {error && (
                <p id="newsletter-popup-error" role="alert" className="text-xs text-center" style={{ color: "var(--maroon)" }}>{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold transition-opacity disabled:opacity-50"
                style={{ background: "var(--text)", color: "var(--cream)" }}
              >
                {loading ? "רגע..." : (
                  <span className="flex items-center justify-center gap-2">
                    קבל קופון 5%
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </span>
                )}
              </button>
              <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
                ההרשמה כפופה ל
                <a href="/privacy" className="underline mx-1">מדיניות פרטיות</a>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
