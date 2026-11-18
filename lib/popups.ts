/**
 * Site popups: messages shown over the storefront that a visitor must
 * acknowledge before browsing on. Pure helpers, safe for client components.
 */

export type PopupFrequency = "visit" | "once";

export interface PublicPopup {
  id: string;
  title: string;
  subtitle: string;
  text: string;
  image: string | null;
  frequency: PopupFrequency;
  version: number;
}

export const POPUP_FREQUENCIES: { key: PopupFrequency; label: string }[] = [
  { key: "visit", label: "בכל כניסה לאתר" },
  { key: "once", label: "פעם אחת בלבד ללקוח (אחרי שאישר)" },
];

export const POPUP_CONFIRM_LABEL = "קראתי ואני מאשר";

/** Where a visitor's acknowledgement is remembered in the browser. */
export function popupAckKey(p: { id: string; version: number }): string {
  return `swebo_popup_ack:${p.id}:${p.version}`;
}

/** Shown right now: switched on and inside its schedule. */
export function isPopupLive(
  p: { active: boolean; startsAt: Date | null; endsAt: Date | null },
  now: Date,
): boolean {
  if (!p.active) return false;
  if (p.startsAt && p.startsAt > now) return false;
  if (p.endsAt && p.endsAt <= now) return false;
  return true;
}

export type PopupStatus = "live" | "scheduled" | "ended" | "off";

export function popupStatus(
  p: { active: boolean; startsAt: Date | null; endsAt: Date | null },
  now: Date,
): PopupStatus {
  if (!p.active) return "off";
  if (p.endsAt && p.endsAt <= now) return "ended";
  if (p.startsAt && p.startsAt > now) return "scheduled";
  return "live";
}

const MAX_TEXT = 5000;
const MAX_TITLE = 120;
const MAX_SUBTITLE = 200;

function parseDate(v: unknown): Date | null | undefined {
  if (v === null || v === "" || v === undefined) return null;
  if (typeof v !== "string") return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** A popup save from the admin, checked. */
export function popupInput(body: Record<string, unknown>):
  | {
      ok: true;
      data: {
        title: string; subtitle: string; text: string; image: string | null; active: boolean;
        frequency: PopupFrequency; startsAt: Date | null; endsAt: Date | null;
      };
    }
  | { ok: false; error: string } {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const subtitle = typeof body.subtitle === "string" ? body.subtitle.trim() : "";
  const text = typeof body.text === "string" ? body.text.replace(/\r\n/g, "\n").trim() : "";
  const image = typeof body.image === "string" && body.image.trim() ? body.image.trim() : null;
  if (!title && !text && !image) return { ok: false, error: "יש להזין כותרת או טקסט, או להעלות תמונה" };
  if (title.length > MAX_TITLE) return { ok: false, error: `הכותרת ארוכה מדי (עד ${MAX_TITLE} תווים)` };
  if (subtitle.length > MAX_SUBTITLE) return { ok: false, error: `תת הכותרת ארוכה מדי (עד ${MAX_SUBTITLE} תווים)` };
  if (text.length > MAX_TEXT) return { ok: false, error: `הטקסט ארוך מדי (עד ${MAX_TEXT} תווים)` };
  const frequency: PopupFrequency = body.frequency === "once" ? "once" : "visit";
  const startsAt = parseDate(body.startsAt);
  const endsAt = parseDate(body.endsAt);
  if (startsAt === undefined || endsAt === undefined) return { ok: false, error: "תאריך לא תקין" };
  if (startsAt && endsAt && endsAt <= startsAt) return { ok: false, error: "מועד הסיום חייב להיות אחרי מועד ההתחלה" };
  return { ok: true, data: { title, subtitle, text, image, active: body.active !== false, frequency, startsAt, endsAt } };
}
