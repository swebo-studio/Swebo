/**
 * Sizes are free-form labels. The store started out selling only tops, so
 * XS–XXL used to be hardcoded in four places; shoes ("42") and pants ("34/32")
 * need arbitrary labels, and the display order can no longer be derived from a
 * fixed array — it comes from ProductColorSize.sortOrder instead.
 */

export interface SizePreset {
  name: string;
  sizes: string[];
}

/** Longest label the admin may type — keeps the storefront buttons sane. */
export const MAX_SIZE_LABEL = 12;

/**
 * Shown on the product page when a colour has no size rows at all. Products
 * created before per-size stock existed rely on this, so it must stay XS–XXL.
 */
export const LEGACY_FALLBACK_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

/** Seeds the presets editor in /admin/config the first time it is opened. */
export const DEFAULT_SIZE_PRESETS: SizePreset[] = [
  { name: "בגדים", sizes: LEGACY_FALLBACK_SIZES },
  { name: "נעליים", sizes: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"] },
  { name: "מכנסיים", sizes: ["30/30", "30/32", "32/30", "32/32", "34/32", "34/34", "36/32", "36/34"] },
];

/** Trim, collapse inner whitespace, cap the length. Returns "" for junk. */
export function normalizeSizeLabel(raw: string): string {
  return String(raw ?? "").trim().replace(/\s+/g, " ").slice(0, MAX_SIZE_LABEL);
}

/** Drop empties and case-insensitive duplicates, keeping the first spelling. */
export function dedupeSizeLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const label of labels) {
    const clean = normalizeSizeLabel(label);
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
  }
  return out;
}

/** "36, 37, 38" or one per line → ["36", "37", "38"]. */
export function parseSizeLabels(text: string): string[] {
  return dedupeSizeLabels(String(text ?? "").split(/[,\n\r]+/));
}

/**
 * Never configured (or unreadable) falls back to the defaults; a configured but
 * empty list stays empty, so deleting every preset does not resurrect them.
 */
export function parseSizePresets(raw: string | undefined | null): SizePreset[] {
  if (!raw) return DEFAULT_SIZE_PRESETS;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_SIZE_PRESETS;
    return parsed
      .map((p) => ({
        name: String(p?.name ?? "").trim(),
        sizes: dedupeSizeLabels(Array.isArray(p?.sizes) ? p.sizes : []),
      }))
      .filter((p) => p.name && p.sizes.length > 0);
  } catch {
    return DEFAULT_SIZE_PRESETS;
  }
}
