"use client";
import { useState } from "react";
import type { Category, PatchDraft, Product, PromotionDraft } from "./types";
import { Choice, Field, NumberInput, RepeatChoice } from "./controls";
import ItemPicker from "./ItemPicker";

const PCT_PRESETS = [100, 50, 30, 20];

/** "Buy from the winter collection, get a summer item free." */
export default function BuyGetForm({
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
  const pct = draft.getDiscountPct;
  // Its own state: deriving it from the value would hide the box mid-typing
  // the moment "2" on the way to "25" became "20", a preset.
  const [custom, setCustom] = useState(pct != null && !PCT_PRESETS.includes(pct));
  return (
    <>
      <Field label="הלקוח קונה">
        <div className="flex items-center gap-2 mb-2">
          <NumberInput value={draft.buyQuantity} onChange={(v) => patch({ buyQuantity: v })} min={1} placeholder="1" ariaLabel="כמה פריטים צריך לקנות" />
          <span className="text-sm font-bold flex-shrink-0" style={{ color: "var(--text)" }}>פריטים מתוך:</span>
        </div>
        <ItemPicker role="buy" items={draft.items} onChange={(items) => patch({ items })} products={products} categories={categories} />
      </Field>

      <Field
        label="ומקבל"
        hint="ההנחה חלה על הפריט הזול ביותר מבין הפריטים המתאימים בסל. הפריט צריך להיות בסל — המבצע לא מוסיף אותו לבד."
      >
        <div className="flex items-center gap-2 mb-2">
          <NumberInput value={draft.getQuantity} onChange={(v) => patch({ getQuantity: v })} min={1} placeholder="1" ariaLabel="כמה פריטים מקבלים" />
          <span className="text-sm font-bold flex-shrink-0" style={{ color: "var(--text)" }}>פריטים מתוך:</span>
        </div>
        <ItemPicker role="get" items={draft.items} onChange={(items) => patch({ items })} products={products} categories={categories} />
      </Field>

      <Field label="בהנחה של">
        <div className="flex flex-col gap-2">
          <Choice
            size="sm"
            value={custom ? -1 : (pct ?? -1)}
            options={[...PCT_PRESETS.map((p) => ({ value: p, label: p === 100 ? "חינם" : `${p}%` })), { value: -1, label: "אחר" }]}
            onChange={(v) => {
              setCustom(v === -1);
              patch({ getDiscountPct: v === -1 ? null : v });
            }}
          />
          {custom && (
            <NumberInput value={pct} onChange={(v) => patch({ getDiscountPct: v })} min={1} max={100} placeholder="אחוז הנחה (1–100)" suffix="%" ariaLabel="אחוז הנחה" />
          )}
        </div>
      </Field>

      <RepeatChoice value={draft.maxApplications} onChange={(v) => patch({ maxApplications: v })} />
    </>
  );
}
