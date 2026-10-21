"use client";
import { Choice, Field, inputClass, inputStyle } from "./controls";
import { ProductBadges } from "@/components/ProductBadge";
import { BADGE_TEXT_MAX, type BadgePosition, type BadgeSize } from "@/lib/promotionBadges";

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

export interface BadgeValue {
  text: string;
  color: string;
  size: BadgeSize;
  position: BadgePosition;
}

/**
 * Text, color, size and corner of one card tag, with a live preview. Shared
 * by a promotion's tag and a product's own tag.
 */
export default function BadgeFields({ value, onChange, autoText = "", hint }: {
  value: BadgeValue;
  onChange: (patch: Partial<BadgeValue>) => void;
  /** Shown as the placeholder and in the preview when the text is empty. */
  autoText?: string;
  hint?: string;
}) {
  return (
    <>
      {/* Live preview on a stand-in product image */}
      <div className="relative w-36 aspect-square mx-auto mb-5 rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)", background: "#e9e7e3" }}>
        <ProductBadges badges={[{ text: value.text.trim() || autoText || "טקסט", color: value.color, size: value.size, position: value.position }]} />
      </div>

      <Field label="טקסט" hint={hint}>
        <input
          type="text"
          value={value.text}
          maxLength={BADGE_TEXT_MAX}
          onChange={(e) => onChange({ text: e.target.value })}
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
              value={value.color}
              onChange={(e) => onChange({ color: e.target.value.toUpperCase() })}
              aria-label="בחירת צבע אחר"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <span aria-hidden className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ background: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)", color: "#fff" }}>+</span>
          </label>
          {SWATCHES.map((c) => {
            const selected = value.color.toUpperCase() === c;
            return (
              <button
                key={c}
                type="button"
                aria-label={`צבע ${c}`}
                aria-pressed={selected}
                onClick={() => onChange({ color: c })}
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
        <Choice value={value.size} options={SIZES} onChange={(v) => onChange({ size: v })} />
      </Field>

      <Field label="מיקום על התמונה">
        <div className="grid grid-cols-2 gap-2">
          {POSITIONS.map(({ value: corner, label }) => {
            const selected = value.position === corner;
            return (
              <button
                key={corner}
                type="button"
                aria-pressed={selected}
                onClick={() => onChange({ position: corner })}
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
      {value.position === "top-right" && (
        <p className="text-xs text-right -mt-3" style={{ color: "var(--text-muted)" }}>
          &quot;אחרונים במלאי&quot; מופיע גם הוא בפינה הזו — התגיות יוצגו זו מתחת לזו.
        </p>
      )}
    </>
  );
}
