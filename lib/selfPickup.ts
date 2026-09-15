/**
 * Where self-pickup orders are collected. The location is fixed; only the
 * explanation text is editable (SiteConfig "selfPickup.text", from /admin/config).
 */

export const SELF_PICKUP_LOCATION = {
  name: "הדסה נעורים",
  city: "בית ינאי",
  lat: 32.3733155,
  lng: 34.8621968,
};

export const SELF_PICKUP_DEFAULT_TEXT =
  "איסוף עצמי מוכן עד 3 ימי עסקים.\n" +
  "ברוב המקרים ההזמנה מוכנה כבר בשעות הראשונות לאחר ביצוע ההזמנה.\n" +
  "כשההזמנה תהיה מוכנה לאיסוף תקבלו הודעה.\n" +
  "\n" +
  "מרגע שההזמנה מופיעה כמוכנה לאיסוף, ניתן להגיע כמעט בכל שעה.\n" +
  "במקרים מיוחדים ניתן ליצור איתנו קשר ונשמח לעזור.";
