"use client";
import { useState } from "react";
import { duplicateSizeLabels, hasBlankSizeLabel, LEGACY_FALLBACK_SIZES, MAX_SIZE_LABEL, normalizeSizeLabel, parseSizeLabels, type SizePreset } from "@/lib/sizes";

export interface SizeStock { size: string; stock: number }

interface Props {
  rows: SizeStock[];
  onChange: (rows: SizeStock[]) => void;
  presets: SizePreset[];
  /** Other colours of the same product, so a size list can be reused. */
  copySources?: { label: string; rows: SizeStock[] }[];
  inputStyle: React.CSSProperties;
}

/**
 * Free-form size rows for one colour. Labels are whatever the shop types —
 * "M", "42", "34/32" — and the row order is the order customers see.
 */
export default function SizeStockEditor({ rows, onChange, presets, copySources = [], inputStyle }: Props) {
  const [draft, setDraft] = useState("");

  const duplicates = duplicateSizeLabels(rows);
  const blank = hasBlankSizeLabel(rows);

  function addLabels(labels: string[]) {
    const taken = new Set(rows.map((r) => normalizeSizeLabel(r.size).toLowerCase()));
    const added = labels
      .filter((label) => !taken.has(label.toLowerCase()))
      .map((size) => ({ size, stock: 0 }));
    if (added.length > 0) onChange([...rows, ...added]);
  }

  function commitDraft() {
    addLabels(parseSizeLabels(draft));
    setDraft("");
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  const btn = "px-2 py-1 rounded-lg text-xs border transition-opacity hover:opacity-70 disabled:opacity-30";

  return (
    <div className="flex flex-col gap-2">
      {/* Quick fill */}
      <div className="flex flex-wrap gap-1.5 justify-end items-center">
        {copySources.map((source) => (
          <button
            key={source.label}
            type="button"
            onClick={() => addLabels(source.rows.map((r) => normalizeSizeLabel(r.size)).filter(Boolean))}
            className={btn}
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
          >
            העתק מ{source.label}
          </button>
        ))}
        {presets.map((preset) => (
          <button
            key={preset.name}
            type="button"
            onClick={() => addLabels(preset.sizes)}
            className={btn}
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            {preset.name}
          </button>
        ))}
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>מילוי מהיר:</span>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-right px-2 py-1.5 rounded-lg" style={{ background: "var(--cream-dark)", color: "var(--text-muted)" }}>
          לא הוגדרו מידות — בעמוד המוצר יוצגו מידות ברירת המחדל ({LEGACY_FALLBACK_SIZES.join(", ")}).
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {rows.map((row, i) => {
            const isDuplicate = duplicates.has(normalizeSizeLabel(row.size).toLowerCase());
            return (
              <div key={i} className="flex items-center gap-1.5">
                <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))} className={btn} style={{ borderColor: "#f5e8e8", color: "var(--maroon)" }} title="הסר מידה">✕</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} className={btn} style={{ borderColor: "var(--border)", color: "var(--text-muted)" }} title="הזז למטה">↓</button>
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className={btn} style={{ borderColor: "var(--border)", color: "var(--text-muted)" }} title="הזז למעלה">↑</button>
                <input
                  type="number"
                  min={0}
                  value={row.stock}
                  onChange={(e) => onChange(rows.map((r, j) => j === i ? { ...r, stock: Math.max(0, Number(e.target.value)) } : r))}
                  className="w-20 px-2 py-1.5 rounded-lg border text-center outline-none text-sm"
                  style={inputStyle}
                  title="מלאי"
                />
                <input
                  type="text"
                  value={row.size}
                  maxLength={MAX_SIZE_LABEL}
                  onChange={(e) => onChange(rows.map((r, j) => j === i ? { ...r, size: e.target.value } : r))}
                  placeholder="מידה"
                  className="flex-1 px-2 py-1.5 rounded-lg border text-right outline-none text-sm font-bold"
                  style={{ ...inputStyle, borderColor: isDuplicate || !normalizeSizeLabel(row.size) ? "var(--maroon)" : inputStyle.borderColor }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Add sizes */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={commitDraft}
          disabled={!draft.trim()}
          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity disabled:opacity-30"
          style={{ background: "var(--text)", color: "var(--cream)" }}
        >
          הוסף
        </button>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitDraft(); } }}
          placeholder="מידות חדשות, מופרדות בפסיק — 40, 41, 42"
          className="flex-1 px-2 py-1.5 rounded-lg border text-right outline-none text-sm"
          style={inputStyle}
        />
      </div>

      {(duplicates.size > 0 || blank) && (
        <p className="text-xs text-right" style={{ color: "var(--maroon)" }}>
          {duplicates.size > 0 ? "יש מידות כפולות — תקן או הסר כדי לשמור." : "יש מידה ללא שם — תקן או הסר כדי לשמור."}
        </p>
      )}
    </div>
  );
}
