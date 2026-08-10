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
  /** Heading the template is filed under at /admin/sms. */
  group?: string;
}

export const SMS_GROUP_GENERAL = "הודעות כלליות";
export const SMS_GROUP_STAGE_DELIVERY = "עדכוני סטטוס — משלוח עד הבית";
export const SMS_GROUP_STAGE_EPOST = "עדכוני סטטוס — משלוח לנקודת איסוף";
export const SMS_GROUP_STAGE_PICKUP = "עדכוני סטטוס — איסוף עצמי";

export const SMS_TEMPLATES: Record<string, SmsTemplateDef> = {
  "sms.couponSignup": {
    label: "קופון הרשמה לניוזלטר",
    description: "נשלח מיד לאחר הרשמה לדיוור (פופאפ / טופס בתחתית האתר)",
    default: "ברוך הבא למשפחת SWEBO! קוד הקופון שלך ל-5% הנחה על ההזמנה הראשונה: {code}. בתוקף ל-60 שעות.",
    placeholders: [
      { tag: "{code}", desc: "קוד הקופון" },
    ],
    group: SMS_GROUP_GENERAL,
  },
  "sms.couponReminder": {
    label: "תזכורת קופון לא נוצל",
    description: "נשלח אוטומטית 24 שעות לאחר ההרשמה אם הקופון עדיין לא נוצל",
    default: "תזכורת מ-SWEBO: עדיין לא ניצלת את קופון ה-5% שלך ({code})! הקופון בתוקף ל-36 שעות נוספות בלבד.",
    placeholders: [
      { tag: "{code}", desc: "קוד הקופון" },
    ],
    group: SMS_GROUP_GENERAL,
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
    group: SMS_GROUP_GENERAL,
  },

  // ── Stage updates: home delivery (also the fallback for legacy orders
  //    saved before deliveryMode existed) ──────────────────────────────────
  "sms.stagePacked": {
    label: "ההזמנה ארוזה",
    description: 'נשלח כשמעבירים הזמנת משלוח עד הבית לשלב "ארוז"',
    default: "היי {name}, ההזמנה שלך ב-SWEBO (#{orderId}) ארוזה ומוכנה לצאת לדרך. נעדכן ברגע שתישלח.",
    placeholders: [
      { tag: "{name}", desc: "שם הלקוח" },
      { tag: "{orderId}", desc: "מספר הזמנה (6 ספרות אחרונות)" },
    ],
    group: SMS_GROUP_STAGE_DELIVERY,
  },
  "sms.stageShipped": {
    label: "ההזמנה נשלחה",
    description: 'נשלח כשמעבירים הזמנת משלוח עד הבית לשלב "במשלוח"',
    default: "{name}, ההזמנה שלך ב-SWEBO (#{orderId}) יצאה למשלוח! היא תגיע אליך בימים הקרובים.",
    placeholders: [
      { tag: "{name}", desc: "שם הלקוח" },
      { tag: "{orderId}", desc: "מספר הזמנה (6 ספרות אחרונות)" },
      { tag: "{shipment}", desc: "מספר משלוח HFD (ריק אם אין)" },
    ],
    group: SMS_GROUP_STAGE_DELIVERY,
  },
  "sms.stageDone": {
    label: "ההזמנה הושלמה",
    description: 'נשלח כשמעבירים הזמנת משלוח עד הבית לשלב "בוצע"',
    default: "ההזמנה שלך ב-SWEBO (#{orderId}) הושלמה. תודה שקנית אצלנו, {name}!",
    placeholders: [
      { tag: "{name}", desc: "שם הלקוח" },
      { tag: "{orderId}", desc: "מספר הזמנה (6 ספרות אחרונות)" },
    ],
    group: SMS_GROUP_STAGE_DELIVERY,
  },

  // ── Stage updates: epost — ships via HFD, collected at a pickup point ───
  "sms.stagePackedEpost": {
    label: "ההזמנה ארוזה (נקודת איסוף)",
    description: 'נשלח כשמעבירים הזמנה לנקודת איסוף לשלב "ארוז"',
    default: "היי {name}, ההזמנה שלך ב-SWEBO (#{orderId}) ארוזה ומוכנה לצאת לדרך. נעדכן ברגע שתישלח לנקודת האיסוף.",
    placeholders: [
      { tag: "{name}", desc: "שם הלקוח" },
      { tag: "{orderId}", desc: "מספר הזמנה (6 ספרות אחרונות)" },
      { tag: "{pudo}", desc: "שם נקודת האיסוף (ריק אם אין)" },
    ],
    group: SMS_GROUP_STAGE_EPOST,
  },
  "sms.stageShippedEpost": {
    label: "ההזמנה בדרך לנקודת האיסוף",
    description: 'נשלח כשמעבירים הזמנה לנקודת איסוף לשלב "במשלוח"',
    default: "{name}, ההזמנה שלך ב-SWEBO (#{orderId}) בדרך לנקודת האיסוף {pudo}. נעדכן ברגע שתהיה מוכנה לאיסוף.",
    placeholders: [
      { tag: "{name}", desc: "שם הלקוח" },
      { tag: "{orderId}", desc: "מספר הזמנה (6 ספרות אחרונות)" },
      { tag: "{pudo}", desc: "שם נקודת האיסוף (ריק אם אין)" },
      { tag: "{shipment}", desc: "מספר משלוח HFD (ריק אם אין)" },
    ],
    group: SMS_GROUP_STAGE_EPOST,
  },
  "sms.stageDoneEpost": {
    label: "ההזמנה נאספה (נקודת איסוף)",
    description: 'נשלח כשמעבירים הזמנה לנקודת איסוף לשלב "בוצע"',
    default: "ההזמנה שלך ב-SWEBO (#{orderId}) נאספה. תודה שקנית אצלנו, {name}!",
    placeholders: [
      { tag: "{name}", desc: "שם הלקוח" },
      { tag: "{orderId}", desc: "מספר הזמנה (6 ספרות אחרונות)" },
      { tag: "{pudo}", desc: "שם נקודת האיסוף (ריק אם אין)" },
    ],
    group: SMS_GROUP_STAGE_EPOST,
  },

  // ── Stage updates: self-pickup orders (nothing is ever shipped) ─────────
  "sms.stagePackedPickup": {
    label: "ההזמנה ארוזה (איסוף עצמי)",
    description: 'נשלח כשמעבירים הזמנת איסוף עצמי לשלב "ארוז"',
    default: "היי {name}, ההזמנה שלך ב-SWEBO (#{orderId}) ארוזה. נעדכן ברגע שתהיה מוכנה לאיסוף.",
    placeholders: [
      { tag: "{name}", desc: "שם הלקוח" },
      { tag: "{orderId}", desc: "מספר הזמנה (6 ספרות אחרונות)" },
    ],
    group: SMS_GROUP_STAGE_PICKUP,
  },
  "sms.stageShippedPickup": {
    label: "ההזמנה מוכנה לאיסוף",
    description: 'נשלח כשמעבירים הזמנת איסוף עצמי לשלב "במשלוח"',
    default: "{name}, ההזמנה שלך ב-SWEBO (#{orderId}) מוכנה לאיסוף! נשמח לראות אותך.",
    placeholders: [
      { tag: "{name}", desc: "שם הלקוח" },
      { tag: "{orderId}", desc: "מספר הזמנה (6 ספרות אחרונות)" },
    ],
    group: SMS_GROUP_STAGE_PICKUP,
  },
  "sms.stageDonePickup": {
    label: "ההזמנה נאספה",
    description: 'נשלח כשמעבירים הזמנת איסוף עצמי לשלב "בוצע"',
    default: "ההזמנה שלך ב-SWEBO (#{orderId}) נאספה. תודה שקנית אצלנו, {name}!",
    placeholders: [
      { tag: "{name}", desc: "שם הלקוח" },
      { tag: "{orderId}", desc: "מספר הזמנה (6 ספרות אחרונות)" },
    ],
    group: SMS_GROUP_STAGE_PICKUP,
  },
};

/**
 * Stage key (Order.orderStage) → SMS template key, one per delivery flavour.
 * Stages absent here send nothing (e.g. "received" — already covered by the
 * order-confirmation SMS).
 */
export const STAGE_SMS_TEMPLATE: Record<
  string,
  { home: string; epost: string; pickup: string }
> = {
  packed:  { home: "sms.stagePacked",  epost: "sms.stagePackedEpost",  pickup: "sms.stagePackedPickup" },
  shipped: { home: "sms.stageShipped", epost: "sms.stageShippedEpost", pickup: "sms.stageShippedPickup" },
  done:    { home: "sms.stageDone",    epost: "sms.stageDoneEpost",    pickup: "sms.stageDonePickup" },
};

/**
 * Which template a stage change should use. Legacy orders saved before
 * deliveryMode existed have it null and fall back to the home-delivery track,
 * matching how the admin orders page labels them.
 */
export function stageSmsTemplateKey(
  stage: string,
  deliveryMode: string | null | undefined
): string | null {
  const entry = STAGE_SMS_TEMPLATE[stage];
  if (!entry) return null;
  if (deliveryMode === "self") return entry.pickup;
  if (deliveryMode === "epost") return entry.epost;
  return entry.home;
}

export function renderSmsTemplate(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{${key}}`).join(value);
  }
  return out;
}
