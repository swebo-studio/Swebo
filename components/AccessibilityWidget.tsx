"use client";
import { useState, useEffect } from "react";

const PREFS_KEY = "a11y_prefs";

interface Prefs {
  fontSize: number; // 0=normal, 1=large, 2=x-large
  contrast: boolean;
  grayscale: boolean;
  highlightLinks: boolean;
}

const defaults: Prefs = { fontSize: 0, contrast: false, grayscale: false, highlightLinks: false };

function applyPrefs(p: Prefs) {
  const html = document.documentElement;
  html.classList.toggle("a11y-large-text", p.fontSize === 1);
  html.classList.toggle("a11y-xlarge-text", p.fontSize === 2);
  html.classList.toggle("a11y-contrast", p.contrast);
  html.classList.toggle("a11y-grayscale", p.grayscale);
  html.classList.toggle("a11y-highlight-links", p.highlightLinks);
}

export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(defaults);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
      const merged = { ...defaults, ...saved };
      setPrefs(merged);
      applyPrefs(merged);
    } catch {}
  }, []);

  function update(patch: Partial<Prefs>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    applyPrefs(next);
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  }

  function reset() {
    setPrefs(defaults);
    applyPrefs(defaults);
    localStorage.removeItem(PREFS_KEY);
  }

  const btnBase = "flex items-center justify-center rounded-lg border-2 transition-all text-sm font-bold px-3 py-2";
  const active = { background: "var(--text)", color: "var(--cream)", borderColor: "var(--text)" };
  const inactive = { background: "transparent", color: "var(--text)", borderColor: "var(--border)" };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-start gap-2">
      {open && (
        <div
          className="rounded-2xl border p-4 flex flex-col gap-3 w-56 shadow-lg"
          style={{ background: "var(--cream-dark)", borderColor: "var(--border)" }}
          role="dialog"
          aria-label="אפשרויות נגישות"
        >
          <div className="flex items-center justify-between mb-1">
            <button onClick={reset} className="text-xs underline hover:opacity-70" style={{ color: "var(--text-muted)" }}>
              איפוס
            </button>
            <span className="font-bold text-sm text-right" style={{ color: "var(--text)" }}>נגישות</span>
          </div>

          {/* Font size */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-right" style={{ color: "var(--text-muted)" }}>גודל טקסט</span>
            <div className="flex gap-1.5 justify-end">
              {[
                { label: "רגיל", val: 0 },
                { label: "גדול", val: 1 },
                { label: "ענק", val: 2 },
              ].map(({ label, val }) => (
                <button
                  key={val}
                  onClick={() => update({ fontSize: val })}
                  className={btnBase}
                  style={prefs.fontSize === val ? active : inactive}
                  aria-pressed={prefs.fontSize === val}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          {[
            { key: "contrast" as const, label: "ניגודיות גבוהה" },
            { key: "grayscale" as const, label: "גווני אפור" },
            { key: "highlightLinks" as const, label: "הדגשת קישורים" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => update({ [key]: !prefs[key] })}
              className={`${btnBase} w-full justify-end gap-2`}
              style={prefs[key] ? active : inactive}
              aria-pressed={prefs[key]}
            >
              <span>{label}</span>
              <span>{prefs[key] ? "✓" : "○"}</span>
            </button>
          ))}

          <a
            href="/accessibility"
            className="text-xs text-right underline hover:opacity-70 mt-1"
            style={{ color: "var(--text-muted)" }}
          >
            הצהרת נגישות
          </a>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="פתח תפריט נגישות"
        aria-expanded={open}
        className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 border-2"
        style={{
          background: open ? "var(--text)" : "var(--cream-dark)",
          borderColor: "var(--border)",
          color: open ? "var(--cream)" : "var(--text)",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm9 7h-6l-1 5-2 8h-2l-2-8-1-5H1V7h20v2z"/>
        </svg>
      </button>
    </div>
  );
}
