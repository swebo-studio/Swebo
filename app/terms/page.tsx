import Header from "@/components/Header";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function TermsPage() {
  const row = await prisma.siteConfig.findUnique({ where: { key: "legal.terms" } });
  const custom = row?.value?.trim();

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-12 text-right" style={{ color: "var(--text)" }}>
        <h1 className="text-3xl font-extrabold mb-2">תקנון ותנאי שימוש</h1>
        <p className="text-sm mb-10" style={{ color: "var(--text-muted)" }}>
          ברוכים הבאים לחנות SWEBO. ביצוע רכישה מהווה הסכמה לתנאים המפורטים להלן.
        </p>

        {custom ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-muted)" }}>
            {custom}
          </p>
        ) : (
          <section className="flex flex-col gap-8 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
            <div>
              <h2 className="font-bold text-base mb-3" style={{ color: "var(--text)" }}>1. כללי</h2>
              <p className="mb-2">1.1. התקנון מנוסח בלשון זכר מטעמי נוחות בלבד ומתייחס לכל המגדרים.</p>
              <p>1.2. ביצוע רכישה מהווה אישור כי הלקוח קרא, הבין והסכים לתנאי התקנון.</p>
            </div>
            <div>
              <h2 className="font-bold text-base mb-3" style={{ color: "var(--text)" }}>2. ביצוע הזמנה ותשלום</h2>
              <p className="mb-2">2.1. התשלום מתבצע באמצעות לינק תשלום מאובטח.</p>
              <p className="mb-2">2.2. העסקה תיחשב כמאושרת רק לאחר קבלת אישור מחברת האשראי.</p>
              <p>2.3. החנות שומרת לעצמה את הזכות לבטל עסקה במקרה של טעות במחיר, תקלה טכנית, חוסר במלאי או חשד להונאה.</p>
            </div>
            <div>
              <h2 className="font-bold text-base mb-3" style={{ color: "var(--text)" }}>3. אספקה ומשלוחים</h2>
              <p className="mb-2">3.1. זמן האספקה הינו בדרך כלל בין 3–5 ימי עסקים מרגע יציאת המשלוח.</p>
              <p className="mb-2">3.2. ייתכנו עיכובים שאינם בשליטת החנות.</p>
              <p>3.3. על הלקוח לוודא כי פרטי המשלוח שהוזנו נכונים ומלאים.</p>
            </div>
            <div>
              <h2 className="font-bold text-base mb-3" style={{ color: "var(--text)" }}>4. החזרות והחלפת מידות</h2>
              <p className="mb-2">4.1. אין אפשרות להחלפות ישירות. יש להחזיר ולהזמין מחדש.</p>
              <p className="mb-2">4.2. ביטול יתבצע בהתאם לחוק הגנת הצרכן. הזיכוי יינתן עבור המוצרים בלבד, ללא דמי משלוח.</p>
              <p className="mb-2">4.3. עלות החזרה חלה על הלקוח, או 40 ₪ באמצעות שליח החנות.</p>
              <p>4.4. לא ניתן להחזיר פריטים שנעשה בהם שימוש, כובסו, נפגמו או שאינם באריזתם המקורית.</p>
            </div>
            <div>
              <h2 className="font-bold text-base mb-3" style={{ color: "var(--text)" }}>5. ביטול עסקה</h2>
              <p>ביטול עסקה יתבצע בהתאם להוראות החוק. החנות רשאית לגבות דמי ביטול של 5% או 100 ₪ — לפי הנמוך.</p>
            </div>
            <div>
              <h2 className="font-bold text-base mb-3" style={{ color: "var(--text)" }}>6. פרטיות</h2>
              <p>פרטי הלקוח נשמרים בצורה מאובטחת ולא יועברו לצד שלישי ללא הסכמה, למעט לצורך השלמת העסקה.</p>
            </div>
            <div>
              <h2 className="font-bold text-base mb-3" style={{ color: "var(--text)" }}>7. יצירת קשר</h2>
              <p>לשאלות ובירורים ניתן לפנות: <a href="tel:0522770059" className="underline hover:opacity-70">052-277-0059</a></p>
            </div>
            <div>
              <h2 className="font-bold text-base mb-3" style={{ color: "var(--text)" }}>8. דין וסמכות שיפוט</h2>
              <p>הדין החל על תקנון זה הוא הדין הישראלי, וסמכות השיפוט הבלעדית נתונה לבתי המשפט המוסמכים בישראל.</p>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
