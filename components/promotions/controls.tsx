"use client";
/** Small form controls shared by the promotion forms, in the admin's existing style. */

export const inputStyle = { background: "var(--cream-dark)", borderColor: "var(--border)", color: "var(--text)" };
/** 16px on phones — iOS zooms the page into any smaller field on focus — 14px from sm up. */
export const inputClass = "w-full px-3 py-2 rounded-xl border text-right outline-none text-base sm:text-sm";

export function Switch({ on, onToggle, label, small }: { on: boolean; onToggle: () => void; label: string; small?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className={`relative ${small ? "w-10 h-5" : "w-12 h-6"} rounded-full transition-colors cursor-pointer flex-shrink-0`}
      style={{ background: on ? "var(--green)" : "var(--border)" }}
    >
      <span
        className={`absolute ${small ? "top-0.5" : "top-1"} w-4 h-4 bg-white rounded-full transition-transform shadow`}
        style={{ right: 0, transform: on ? `translateX(${small ? -22 : -28}px)` : `translateX(${small ? -2 : -4}px)` }}
      />
    </button>
  );
}

/** A row of mutually exclusive buttons. */
export function Choice<T extends string | number>({
  value,
  options,
  onChange,
  size = "md",
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(opt.value)}
            className={`${size === "sm" ? "px-3 py-1 min-h-8" : "flex-1 px-3 py-2"} rounded-xl text-xs font-bold border transition-all`}
            style={{
              borderColor: selected ? "var(--text)" : "var(--border)",
              background: selected ? "var(--text)" : "transparent",
              color: selected ? "var(--cream)" : "var(--text-muted)",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-sm font-bold text-right mb-2" style={{ color: "var(--text)" }}>{label}</p>
      {children}
      {hint && <p className="text-xs text-right mt-1.5" style={{ color: "var(--text-muted)" }}>{hint}</p>}
    </div>
  );
}

/** A whole-number input that reports null while empty. */
export function NumberInput({
  value,
  onChange,
  min = 0,
  max,
  placeholder,
  suffix,
  ariaLabel,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  min?: number;
  max?: number;
  placeholder?: string;
  suffix?: string;
  ariaLabel: string;
}) {
  return (
    <div className="relative flex-1">
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={inputClass}
        style={{ ...inputStyle, paddingLeft: suffix ? "2rem" : undefined }}
      />
      {suffix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base sm:text-sm pointer-events-none" style={{ color: "var(--text-muted)" }}>
          {suffix}
        </span>
      )}
    </div>
  );
}

/** "Only once per order" vs "as many times as the cart allows". */
export function RepeatChoice({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <Field
      label="כמה פעמים בהזמנה?"
      hint={value === 1 ? "המבצע יחול פעם אחת בלבד, גם אם בסל יש מספיק פריטים לכמה פעמים." : "המבצע יחזור על עצמו לכל קבוצה שלמה של פריטים בסל."}
    >
      <Choice
        value={value === 1 ? "once" : "repeat"}
        options={[
          { value: "repeat", label: "בכל פעם שמתקיים" },
          { value: "once", label: "פעם אחת בלבד" },
        ]}
        onChange={(v) => onChange(v === "once" ? 1 : null)}
      />
    </Field>
  );
}
