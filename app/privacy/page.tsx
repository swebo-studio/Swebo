import Header from "@/components/Header";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const row = await prisma.siteConfig.findUnique({ where: { key: "legal.privacy" } });
  const custom = row?.value?.trim();

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-12 text-right" style={{ color: "var(--text)" }}>
        <h1 className="text-3xl font-extrabold mb-8">מדיניות פרטיות</h1>

        {custom ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-muted)" }}>
            {custom}
          </p>
        ) : (
          <section className="flex flex-col gap-6 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
            <div>
              <h2 className="font-bold text-base mb-2" style={{ color: "var(--text)" }}>1. איסוף מידע</h2>
              <p>אנו אוספים מידע אישי (שם, אימייל, טלפון, כתובת) אך ורק לצורך עיבוד הזמנות ושיפור השירות. המידע אינו נמסר לצד שלישי ללא הסכמה.</p>
            </div>
            <div>
              <h2 className="font-bold text-base mb-2" style={{ color: "var(--text)" }}>2. שימוש במידע</h2>
              <p>המידע שנאסף משמש לצורך: עיבוד ומשלוח הזמנות, שליחת אישורי הזמנה, ושיפור חוויית הקנייה.</p>
            </div>
            <div>
              <h2 className="font-bold text-base mb-2" style={{ color: "var(--text)" }}>3. ניוזלטר</h2>
              <p>הרשמה לניוזלטר היא וולונטרית. ניתן לבטל את המנוי בכל עת על ידי פנייה אלינו.</p>
            </div>
            <div>
              <h2 className="font-bold text-base mb-2" style={{ color: "var(--text)" }}>4. אבטחת מידע</h2>
              <p>אנו נוקטים באמצעי אבטחה מתאימים לשמירת המידע האישי. פרטי תשלום מוצפנים ומעובדים על ידי HYP בלבד.</p>
            </div>
            <div>
              <h2 className="font-bold text-base mb-2" style={{ color: "var(--text)" }}>5. עוגיות (Cookies)</h2>
              <p>האתר עשוי להשתמש בעוגיות לשיפור חוויית המשתמש. ניתן לבטל עוגיות בהגדרות הדפדפן.</p>
            </div>
            <div>
              <h2 className="font-bold text-base mb-2" style={{ color: "var(--text)" }}>6. זכויות המשתמש</h2>
              <p>על פי חוק הגנת הפרטיות, יש לך הזכות לעיין במידע הנשמר עליך, לתקנו או למחוק אותו. לבקשות פנה אלינו דרך WhatsApp.</p>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
