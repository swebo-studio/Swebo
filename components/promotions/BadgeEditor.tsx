"use client";
import type { PatchDraft, PromotionDraft } from "./types";
import { Choice, Field, Switch, inputClass, inputStyle } from "./controls";
import { ProductBadges } from "@/components/ProductBadge";
import { BADGE_TEXT_MAX, defaultBadgeText, type BadgePosition, type BadgeSize } from "@/lib/promotionBadges";

const SWATCHES = ["#1E6B3C", "#7B1D2E", "#B34700", "#111111", "#1D4ED8", "#DB2777", "#FACC15", "#FFFFFF"];

const SIZES: { value: BadgeSize; label: string }[] = [
  { value: "sm", label: "קטנה" },
  { value: "md", label: "בינונית" },
  { value: "lg", label: "גדולה" },
];

/** Laid out as the corners of the image they stand for — the page is RTL, so the first of each row sits on the right. */
const POSITIONS: { value: BadgePosition; label: string }[] = [
  { value: "top-right", label: "ימין למעלה" },
  { value: "top-left", label: "שמאל למעלה" },
  { value: "bottom-right", label: "ימין למטה" },
  { value: "bottom-left", label: "שמאל למטה" },
];

/** The tag this promotion puts on the product cards it covers. */
export default function BadgeEditor({ draft, patch }: { draft: PromotionDraft; patch: PatchDraft }) {
  const autoText = defaultBadgeText(draft);
  const text = draft.badgeText.trim() || autoText;

  return (
    <div className="p-3 rounded-xl border mb-5" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center justify-end gap-3">
        <span className="text-xs font-bold" style={{ color: "var(--text)" }}>
          {draft.badgeEnabled ? "מוצגת תגית על המוצרים" : "בלי תגית על המוצרים"}
        </span>
        <Switch on={draft.badgeEnabled} onToggle={() => patch({ badgeEnabled: !draft.badgeEnabled })} label="תגית על המוצרים" />
      </div>
      <p className="text-xs text-right mt-1.5" style={{ color: "var(--text-muted)" }}>
        {draft.kind === "rules"
          ? "התגית תופיע על המוצרים שבהנחה, או על כל המוצרים כשההטבה היא על כל הסל."
          : "התגית תופיע על כל מוצר שנכלל במבצע."}
      </p>

      {draft.badgeEnabled && (
        <div className="mt-4">
          {/* Live preview on a stand-in product image */}
          <div className="relative w-36 aspect-square mx-auto mb-5 rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)", background: "#e9e7e3" }}>
            <ProductBadges badges={[{ text, color: draft.badgeColor, size: draft.badgeSize, position: draft.badgePosition }]} />
          </div>

          <Field label="טקסט" hint={draft.badgeText.trim() ? undefined : `ריק = "${autoText}", לפי המבצע`}>
            <input
              type="text"
              value={draft.badgeText}
              maxLength={BADGE_TEXT_MAX}
              onChange={(e) => patch({ badgeText: e.target.value })}
              placeholder={autoText}
              aria-label="טקסט התגית"
              className={inputClass}
              style={inputStyle}
            />
          </Field>

          <Field label="צבע">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <label className="relative w-8 h-8 rounded-full border overflow-hidden cursor-pointer" style={{ borderColor: "var(--border)" }} title="צבע אחר">
                <input
                  type="color"
                  value={draft.badgeColor}
                  onChange={(e) => patch({ badgeColor: e.target.value.toUpperCase() })}
                  aria-label="בחירת צבע אחר"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <span aria-hidden className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ background: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)", color: "#fff" }}>+</span>
              </label>
              {SWATCHES.map((c) => {
                const selected = draft.badgeColor.toUpperCase() === c;
                return (
                  <button
                    key={c}
                    type="button"
                    aria-label={`צבע ${c}`}
                    aria-pressed={selected}
                    onClick={() => patch({ badgeColor: c })}
                    className="w-8 h-8 rounded-full border"
                    style={{
                      background: c,
                      borderColor: "var(--border)",
                      boxShadow: selected ? "0 0 0 2px var(--cream), 0 0 0 4px var(--text)" : undefined,
                    }}
                  />
                );
              })}
            </div>
          </Field>

          <Field label="גודל">
            <Choice value={draft.badgeSize} options={SIZES} onChange={(v) => patch({ badgeSize: v })} />
          </Field>

          <Field label="מיקום על התמונה">
            <div className="grid grid-cols-2 gap-2">
              {POSITIONS.map(({ value, label }) => {
                const selected = draft.badgePosition === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => patch({ badgePosition: value })}
                    className="px-3 py-2 rounded-xl text-xs font-bold border transition-all"
                    style={{
                      borderColor: selected ? "var(--text)" : "var(--border)",
                      background: selected ? "var(--text)" : "transparent",
                      color: selected ? "var(--cream)" : "var(--text-muted)",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </Field>
          {draft.badgePosition === "top-right" && (
            <p className="text-xs text-right -mt-3" style={{ color: "var(--text-muted)" }}>
              &quot;אחרונים במלאי&quot; מופיע גם הוא בפינה הזו — התגיות יוצגו זו מתחת לזו.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
