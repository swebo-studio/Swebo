import { prisma } from "@/lib/db";
import Header from "@/components/Header";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "יישובים מרוחקים | SWEBO",
  description: "רשימת יישובים מרוחקים שאינם זכאים למשלוח רגיל עד 5 ימי עסקים",
};

const LOCALITIES: string[] = [
  // אזור הנגב והערבה
  "אבות", "אורים", "אחיסמך", "אל-עזזמה", "אל-פורעה", "אל-קסום", "אמצה", "ארז",
  "אשלים", "בארי", "בית ניר", "בכורה", "גבולות", "גבעולים", "גבעות בר",
  "גדות", "גורן", "דביר", "דגניה א", "דגניה ב", "דורות", "הבונים",
  "יד מרדכי", "ים המלח", "ירוחם", "כסייפה", "כפר מנחם",
  "להב", "להבות הבשן", "מבועות", "מגן", "מגנזי", "מחנה תל נוף",
  "מיטב", "מישור רותם", "מיתר", "מכמנים", "מסלול", "מצפה רמון",
  "מצפה שלם", "מרכז שפירא", "נבטים", "נחל עוז", "נחל שנהב",
  "ניצן ב", "ניצנה", "נירים", "נתיב העשרה", "סעד", "עין גדי",
  "עין הבשור", "עין הנציב", "עין יהב", "עין חצבה", "עין כרמל",
  "עינות", "עמינדב", "עציון גבר", "ערד", "ערוגות", "עשרת", "פארן",
  "פרי גן", "צאלים", "צבאים", "צוחר", "צין", "צופר", "צור נתן",
  "ראמה", "רביד", "רגבה", "שדה אברהם", "שדה בוקר", "שדות ים",
  "שדמות דבורה", "שובל", "שובה", "שוקדה", "שלומית", "שקמים",
  "תדהר", "תל גמר", "תל מונד", "תלמי בילו", "תלמי יחיאל",
  // גבול הרצועה
  "כיסופים", "מפלסים", "מרגנית", "נחשונים", "נחשון", "פדויים",
  // אזור הגולן
  "אודם", "אלוני הבשן", "אל-רום", "אניעם", "אפיק", "אשדות יעקב איחוד",
  "בני יהודה", "בקעת כינרת", "גשור", "חד נס", "חמת גדר", "יונתן",
  "כפר חרוב", "מגדל שמס", "מסעדה", "מרום גולן", "נאות גולן", "נבו",
  "נטור", "עין זיוון", "עין קניה", "עלמה", "קדמת צבי", "קשת",
  "שעל", "שפם",
  // בקעת הירדן
  "ארגמן", "גלגל", "גיתית", "מכורה", "מנוחה", "נעמה", "נעמי",
  "עין צוקים", "פצאל", "קידה", "רועי", "שדמות מחולה", "תומר",
  // אזור אילת
  "אילת", "אילות", "ספיר", "שחרות", "יוטבתה", "גרופית", "סמר",
  "עין תמר", "עקבה", "קטורה",
];

export default async function YeshuvimMerukhakimPage() {
  const contactRow = await prisma.siteConfig.findUnique({ where: { key: "contact.whatsapp" } });
  const waLink = contactRow?.value || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";
  const waHref = waLink.startsWith("http") ? waLink : waLink ? `https://wa.me/${waLink}` : "";

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-12 text-right" dir="rtl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm mb-8 hover:opacity-70 transition-opacity"
          style={{ color: "var(--text-muted)" }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          חזרה לחנות
        </Link>

        <h1 className="text-3xl font-extrabold mb-3" style={{ color: "var(--text)" }}>
          יישובים מרוחקים
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
          ליישובים המפורטים להלן זמן האספקה עשוי להיות ארוך מחמישה ימי עסקים.
          לפרטים נוספים ניתן לפנות אלינו.
        </p>

        <div
          className="rounded-2xl border p-6 mb-8"
          style={{ background: "var(--cream-dark)", borderColor: "var(--border)" }}
        >
          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
            {LOCALITIES.sort((a, b) => a.localeCompare(b, "he")).map((name) => (
              <p key={name} className="text-sm" style={{ color: "var(--text)" }}>
                {name}
              </p>
            ))}
          </div>
        </div>

        {waHref && (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            הרשימה מתעדכנת מעת לעת בהתאם לשירות HFD. לשאלות:{" "}
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
              style={{ color: "var(--text)" }}
            >
              צור קשר בוואטסאפ
            </a>
          </p>
        )}
      </main>
    </>
  );
}
