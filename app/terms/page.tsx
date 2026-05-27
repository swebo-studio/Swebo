import Header from "@/components/Header";

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-12 text-right" style={{ color: "var(--text)" }}>
        <h1 className="text-3xl font-extrabold mb-8">תנאי שימוש</h1>

        <section className="flex flex-col gap-6 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
          <div>
            <h2 className="font-bold text-base mb-2" style={{ color: "var(--text)" }}>1. כללי</h2>
            <p>השימוש באתר SWEBO מהווה הסכמה לתנאי השימוש המפורטים להלן. החברה שומרת לעצמה את הזכות לשנות תנאים אלה בכל עת.</p>
          </div>
          <div>
            <h2 className="font-bold text-base mb-2" style={{ color: "var(--text)" }}>2. הזמנות ומוצרים</h2>
            <p>כל ההזמנות כפופות לזמינות המלאי. החברה שומרת לעצמה את הזכות לבטל הזמנה במקרה של טעות במחיר או חוסר במלאי, תוך החזר מלא ללקוח.</p>
          </div>
          <div>
            <h2 className="font-bold text-base mb-2" style={{ color: "var(--text)" }}>3. משלוחים</h2>
            <p>זמני האספקה הם 3–7 ימי עסקים. החברה אינה אחראית לעיכובים הנובעים מחברת המשלוחים.</p>
          </div>
          <div>
            <h2 className="font-bold text-base mb-2" style={{ color: "var(--text)" }}>4. החזרות והחלפות</h2>
            <p>ניתן להחזיר מוצר תוך 14 יום מיום קבלתו, בתנאי שהמוצר לא נעשה בו שימוש ונמצא באריזתו המקורית. עלות המשלוח החוזר על חשבון הלקוח.</p>
          </div>
          <div>
            <h2 className="font-bold text-base mb-2" style={{ color: "var(--text)" }}>5. תשלומים</h2>
            <p>התשלום מבוצע בצורה מאובטחת דרך מערכת GROW. החברה אינה שומרת פרטי כרטיס אשראי.</p>
          </div>
          <div>
            <h2 className="font-bold text-base mb-2" style={{ color: "var(--text)" }}>6. יצירת קשר</h2>
            <p>לכל שאלה ניתן לפנות אלינו דרך WhatsApp או עמוד הקשר באתר.</p>
          </div>
        </section>
      </main>
    </>
  );
}
