"use client";
import type { Category, PatchDraft, Product, PromotionDraft } from "./types";
import { Field, NumberInput, RepeatChoice } from "./controls";
import ItemPicker from "./ItemPicker";

/** "3 items for ₪200" — a fixed price for any N items from a chosen list. */
export default function BundleForm({
  draft,
  patch,
  products,
  categories,
}: {
  draft: PromotionDraft;
  patch: PatchDraft;
  products: Product[];
  categories: Category[];
}) {
  return (
    <>
      <Field
        label="המבצע"
        hint="המחיר הוא לכל הפריטים יחד. החבילה נבנית מהפריטים היקרים בסל, ורק כשהיא באמת זולה מהמחיר הרגיל."
      >
        <div className="flex items-center gap-2">
          <NumberInput value={draft.buyQuantity} onChange={(v) => patch({ buyQuantity: v })} min={2} placeholder="3" ariaLabel="כמות פריטים בחבילה" />
          <span className="text-sm font-bold flex-shrink-0" style={{ color: "var(--text)" }}>פריטים ב-</span>
          <NumberInput value={draft.bundlePrice} onChange={(v) => patch({ bundlePrice: v })} min={0} placeholder="200" suffix="₪" ariaLabel="מחיר החבילה" />
        </div>
      </Field>

      <Field label="מאילו פריטים אפשר להרכיב את החבילה?">
        <ItemPicker role="buy" items={draft.items} onChange={(items) => patch({ items })} products={products} categories={categories} />
      </Field>

      <RepeatChoice value={draft.maxApplications} onChange={(v) => patch({ maxApplications: v })} />
    </>
  );
}
