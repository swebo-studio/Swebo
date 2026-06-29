/**
 * Builds a wa.me link from the admin-configured contact.whatsapp value, which
 * may be a raw phone number ("972501234567") or a full wa.me business link
 * ("https://wa.me/message/XXXX"). Stripping non-digits from the latter would
 * mangle it, so full links are used as-is.
 */
export function buildWhatsAppHref(link: string, text?: string): string {
  if (!link) return "";
  const base = link.startsWith("http") ? link : `https://wa.me/${link.replace(/\D/g, "")}`;
  if (!text) return base;
  return `${base}${base.includes("?") ? "&" : "?"}text=${encodeURIComponent(text)}`;
}
