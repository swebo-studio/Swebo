import Header from "@/components/Header";

export const metadata = { title: "הצהרת נגישות" };

export default function AccessibilityPage() {
  const wa = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "972522770059";

  return (
    <>
      <Header />
      <main id="main-content" className="max-w-2xl mx-auto px-4 py-12 text-right" style={{ color: "var(--text)" }}>
        <h1 className="text-3xl font-extrabold mb-2">הצהרת נגישות</h1>
        <p className="text-sm mb-10" style={{ color: "var(--text-muted)" }}>
          עודכן לאחרונה: {new Date().getFullYear()}
        </p>

        <section className="flex flex-col gap-8 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
          <div>
            <h2 className="font-bold text-base mb-2" style={{ color: "var(--text)" }}>מחויבות לנגישות</h2>
            <p>
              SWEBO מחויבת להנגשת האתר לאנשים עם מוגבלות, בהתאם לחוק שוויון זכויות לאנשים עם מוגבלות (תשנ&quot;ח–1998)
              ותקנות הנגישות (IS 5568). אנו שואפים לעמוד ברמת WCAG 2.1 AA.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-base mb-2" style={{ color: "var(--text)" }}>מה הונגש באתר</h2>
            <ul className="flex flex-col gap-1.5 list-disc list-inside">
              <li>ניווט מלא במקלדת</li>
              <li>תמיכה בקוראי מסך (טקסט חלופי לתמונות, תוויות ARIA)</li>
              <li>כפתור נגישות לשינוי גודל טקסט, ניגודיות גבוהה וגווני אפור</li>
              <li>אתר מגיב למובייל ולכל גדלי המסך</li>
              <li>שפת האתר מוגדרת כעברית (lang=&quot;he&quot;)</li>
              <li>סדר קריאה לוגי ומאורגן</li>
            </ul>
          </div>

          <div>
            <h2 className="font-bold text-base mb-2" style={{ color: "var(--text)" }}>מגבלות ידועות</h2>
            <p>
              חלק מהתכנים שמועלים על ידי ספקים חיצוניים (כגון עמוד התשלום של HYP) אינם בשליטתנו הישירה.
              אנו פועלים לשיפור מתמיד של הנגישות.
            </p>
          </div>

          <div>
            <h2 className="font-bold text-base mb-2" style={{ color: "var(--text)" }}>רכז נגישות</h2>
            <p className="mb-3">
              נתקלת בבעיית נגישות? ניתן לפנות לרכז הנגישות שלנו:
            </p>
            <ul className="flex flex-col gap-1.5">
              <li><strong>שם:</strong> אורי דוד</li>
              <li>
                <strong>טלפון:</strong>{" "}
                <a href="tel:0522770059" className="underline hover:opacity-70">052-277-0059</a>
              </li>
              <li>
                <strong>אימייל:</strong>{" "}
                <a href="mailto:streetwearbyori@gmail.com" className="underline hover:opacity-70">streetwearbyori@gmail.com</a>
              </li>
              <li>
                <a
                  href={`https://wa.me/${wa.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:opacity-70"
                >
                  WhatsApp
                </a>
              </li>
            </ul>
            <p className="mt-3">נשתדל לטפל בפנייה תוך 5 ימי עסקים.</p>
          </div>
        </section>
      </main>
    </>
  );
}
