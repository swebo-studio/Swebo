/**
 * Admin-written text pages, served at /info/[slug]. Pure helpers, safe for
 * client components.
 */

const SLUG = /^[a-z0-9א-ת-]{1,60}$/;

/** "שאלות נפוצות" → "שאלות-נפוצות": a URL part made from a title. */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[֑-ׇ]/g, "") // niqqud
    .replace(/[^a-z0-9א-ת]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function isSlug(value: unknown): value is string {
  return typeof value === "string" && SLUG.test(value) && !value.startsWith("-") && !value.endsWith("-");
}

export const pagePath = (slug: string) => `/info/${encodeURIComponent(slug)}`;

/** A page save from the admin, checked. */
export function pageInput(body: unknown):
  | { ok: true; data: { title: string; slug: string; content: string; published: boolean } }
  | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const title = typeof b.title === "string" ? b.title.trim().slice(0, 100) : "";
  if (!title) return { ok: false, error: "חסרה כותרת לעמוד" };
  const slug = typeof b.slug === "string" && b.slug.trim() ? b.slug.trim().toLowerCase() : slugify(title);
  if (!isSlug(slug)) return { ok: false, error: "כתובת העמוד יכולה להכיל רק אותיות, ספרות ומקפים" };
  const content = typeof b.content === "string" ? b.content.slice(0, 50_000) : "";
  return { ok: true, data: { title, slug, content, published: b.published !== false } };
}
