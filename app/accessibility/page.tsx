import Header from "@/components/Header";

export const metadata = { title: "הצהרת נגישות" };

// Fixed on purpose: a statement that renders the current year every time it is
// opened tells a regulator nothing about when the site was last reviewed.
const LAST_REVIEWED = "8 בספטמבר 2026";

export default function AccessibilityPage() {
  const wa = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "972522770059";

  return (
    <>
      <Header />
      <main id="main-content" className="max-w-2xl mx-auto px-4 py-12 text-right" style={{ color: "var(--text)" }}>
        <h1 className="text-3xl font-extrabold mb-2">הצהרת נגישות</h1>
        <p className="text-sm mb-10" style={{ color: "var(--text-muted)" }}>
          עודכן לאחרונה: {LAST_REVIEWED}
        </p>

        <div className="flex flex-col gap-8 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
          <section aria-labelledby="a11y-commitment">
            <h2 id="a11y-commitment" className="font-bold text-base mb-2" style={{ color: "var(--text)" }}>מחויבות לנגישות</h2>
            <p>
              SWEBO מחויבת להנגשת האתר לאנשים עם מוגבלות, בהתאם לחוק שוויון זכויות לאנשים עם מוגבלות (תשנ&quot;ח–1998)
              ותקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע&quot;ג–2013, ולתקן הישראלי
              ת&quot;י 5568 המבוסס על הנחיות WCAG 2.1. האתר נבנה במטרה לעמוד ברמת AA.
            </p>
          </section>

          <section aria-labelledby="a11y-widget">
            <h2 id="a11y-widget" className="font-bold text-base mb-2" style={{ color: "var(--text)" }}>תפריט הנגישות</h2>
            <p className="mb-3">
              בפינה הימנית התחתונה של כל עמוד מופיע כפתור נגישות. פתיחתו מציגה תפריט שמאפשר:
            </p>
            <ul className="flex flex-col gap-1.5 list-disc list-inside">
              <li>הגדלה והקטנה של גודל הטקסט (עד 150%)</li>
              <li>ניגודיות גבוהה — שחור על לבן</li>
              <li>ניגודיות הפוכה</li>
              <li>גווני אפור</li>
              <li>רקע בהיר</li>
              <li>הדגשת קישורים</li>
              <li>פונט קריא</li>
              <li>עצירת אנימציות ותנועה באתר</li>
              <li>איפוס כל ההגדרות</li>
            </ul>
            <p className="mt-3">
              ההעדפות נשמרות בדפדפן ונטענות אוטומטית בכל כניסה חוזרת לאתר.
            </p>
          </section>

          <section aria-labelledby="a11y-done">
            <h2 id="a11y-done" className="font-bold text-base mb-2" style={{ color: "var(--text)" }}>מה הונגש באתר</h2>
            <ul className="flex flex-col gap-1.5 list-disc list-inside">
              <li>ניווט מלא במקלדת, כולל סימון ברור של הפוקוס בכל רכיב</li>
              <li>קישור &quot;דלג לתוכן הראשי&quot; בתחילת כל עמוד</li>
              <li>חלונות קופצים ותפריט הצד נסגרים במקש Esc ומחזירים את הפוקוס למקומו</li>
              <li>תמיכה בקוראי מסך: טקסט חלופי לתמונות, תוויות לשדות טופס והכרזה על שינויים בעגלה ובמלאי</li>
              <li>אפשרות לעצור באנרים מתחלפים וסרטון רקע</li>
              <li>כיבוד הגדרת מערכת ההפעלה להפחתת תנועה</li>
              <li>יחסי ניגודיות של 4.5:1 לפחות בטקסט רגיל</li>
              <li>אתר מגיב למובייל ולכל גדלי המסך, וניתן להגדלה עד 200% ללא אובדן תוכן</li>
              <li>שפת האתר מוגדרת כעברית (lang=&quot;he&quot;) וכיוון הכתיבה מימין לשמאל</li>
              <li>מבנה כותרות וסדר קריאה לוגי</li>
            </ul>
          </section>

          <section aria-labelledby="a11y-limits">
            <h2 id="a11y-limits" className="font-bold text-base mb-2" style={{ color: "var(--text)" }}>מגבלות ידועות</h2>
            <ul className="flex flex-col gap-1.5 list-disc list-inside">
              <li>עמוד התשלום מסופק על ידי HYP ואינו בשליטתנו הישירה.</li>
              <li>מפת נקודות האיסוף בעמוד התשלום מבוססת על שירות חיצוני; לצידה מוצגת תמיד רשימה טקסטואלית של הנקודות, הנגישה במקלדת ובקורא מסך.</li>
              <li>ייתכן שתמונות מדריך המידות שהועלו על ידינו אינן מכילות את כל הנתונים כטקסט; טבלת המידות המלאה זמינה כטקסט לצד התמונה.</li>
            </ul>
            <p className="mt-3">אנו פועלים לשיפור מתמיד של הנגישות באתר.</p>
          </section>

          <section aria-labelledby="a11y-contact">
            <h2 id="a11y-contact" className="font-bold text-base mb-2" style={{ color: "var(--text)" }}>רכז נגישות</h2>
            <p className="mb-3">
              נתקלת בבעיית נגישות? נשמח לשמוע. ניתן לפנות לרכז הנגישות שלנו:
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
                  aria-label="WhatsApp (נפתח בחלון חדש)"
                >
                  WhatsApp
                </a>
              </li>
            </ul>
            <p className="mt-3">נשתדל לטפל בפנייה תוך 5 ימי עסקים.</p>
          </section>
        </div>
      </main>
    </>
  );
}
