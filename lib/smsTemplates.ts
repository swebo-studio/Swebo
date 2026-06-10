/**
 * SMS template definitions for messages sent via ActiveTrail.
 * Pure metadata + helper — safe to import from client components.
 * Actual values are stored in SiteConfig (key/value), edited at /admin/sms.
 */

export interface SmsTemplateDef {
  label: string;
  description: string;
  default: string;
  placeholders: { tag: string; desc: string }[];
}

export const SMS_TEMPLATES: Record<string, SmsTemplateDef> = {
  "sms.couponSignup": {
    label: "קופון הרשמה לניוזלטר",
    description: "נשלח מיד לאחר הרשמה לדיוור (פופאפ / טופס בתחתית האתר)",
    default: "ברוך הבא למשפחת SWEBO! קוד הקופון שלך ל-5% הנחה על ההזמנה הראשונה: {code}. בתוקף ל-60 שעות.",
    placeholders: [
      { tag: "{code}", desc: "קוד הקופון" },
    ],
  },
  "sms.couponReminder": {
    label: "תזכורת קופון לא נוצל",
    description: "נשלח אוטומטית 24 שעות לאחר ההרשמה אם הקופון עדיין לא נוצל",
    default: "תזכורת מ-SWEBO: עדיין לא ניצלת את קופון ה-5% שלך ({code})! הקופון בתוקף ל-36 שעות נוספות בלבד.",
    placeholders: [
      { tag: "{code}", desc: "קוד הקופון" },
    ],
  },
  "sms.orderConfirmation": {
    label: "אישור הזמנה / תודה על הרכישה",
    description: "נשלח ללקוח מיד לאחר תשלום מוצלח",
    default: 'תודה {name}! ההזמנה שלך ב-SWEBO התקבלה (#{orderId}): {items}. סה"כ: ₪{total}. נעדכן כשתצא למשלוח.',
    placeholders: [
      { tag: "{name}", desc: "שם הלקוח" },
      { tag: "{orderId}", desc: "מספר הזמנה (6 ספרות אחרונות)" },
      { tag: "{items}", desc: "רשימת פריטים בהזמנה" },
      { tag: "{total}", desc: "סכום לתשלום" },
    ],
  },
};

export function renderSmsTemplate(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{${key}}`).join(value);
  }
  return out;
}
