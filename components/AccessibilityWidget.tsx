"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useDialogA11y } from "@/lib/useDialogA11y";

const PREFS_KEY = "a11y_prefs";

// Kept in sync with the inline boot script in app/layout.tsx, which applies the
// saved preferences before first paint so the page never flashes unadjusted.
export const FONT_STEPS = [1, 1.1, 1.2, 1.35, 1.5];

interface Prefs {
  fontStep: number;
  contrast: boolean;
  invert: boolean;
  lightBg: boolean;
  grayscale: boolean;
  highlightLinks: boolean;
  readableFont: boolean;
  noMotion: boolean;
}

const defaults: Prefs = {
  fontStep: 0,
  contrast: false,
  invert: false,
  lightBg: false,
  grayscale: false,
  highlightLinks: false,
  readableFont: false,
  noMotion: false,
};

function applyPrefs(p: Prefs) {
  const html = document.documentElement;
  const step = Math.min(Math.max(p.fontStep, 0), FONT_STEPS.length - 1);
  html.style.setProperty("--a11y-font-scale", String(FONT_STEPS[step]));
  html.classList.toggle("a11y-contrast", p.contrast);
  html.classList.toggle("a11y-invert", p.invert);
  html.classList.toggle("a11y-light-bg", p.lightBg);
  html.classList.toggle("a11y-grayscale", p.grayscale);
  html.classList.toggle("a11y-highlight-links", p.highlightLinks);
  html.classList.toggle("a11y-readable-font", p.readableFont);
  html.classList.toggle("a11y-no-motion", p.noMotion);
}

type IconProps = { className?: string };

const icons = {
  zoomIn: (p: IconProps) => (
    <svg {...p} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" /><line x1="20" y1="20" x2="16.5" y2="16.5" />
      <line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  ),
  zoomOut: (p: IconProps) => (
    <svg {...p} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" /><line x1="20" y1="20" x2="16.5" y2="16.5" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  ),
  grayscale: (p: IconProps) => (
    <svg {...p} width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="3" y="4" width="2" height="16" /><rect x="7" y="4" width="1" height="16" />
      <rect x="10" y="4" width="3" height="16" /><rect x="15" y="4" width="1" height="16" />
      <rect x="18" y="4" width="3" height="16" />
    </svg>
  ),
  contrast: (p: IconProps) => (
    <svg {...p} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 000 18z" fill="currentColor" />
    </svg>
  ),
  invert: (p: IconProps) => (
    <svg {...p} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  ),
  lightBg: (p: IconProps) => (
    <svg {...p} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M9 18h6M10 22h4" /><path d="M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z" />
    </svg>
  ),
  link: (p: IconProps) => (
    <svg {...p} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7" />
      <path d="M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7" />
    </svg>
  ),
  font: (p: IconProps) => (
    <svg {...p} width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <text x="12" y="18" textAnchor="middle" fontSize="17" fontFamily="Georgia, serif" fontWeight="700">A</text>
    </svg>
  ),
  motion: (p: IconProps) => (
    <svg {...p} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><rect x="9" y="9" width="6" height="6" fill="currentColor" stroke="none" />
    </svg>
  ),
  reset: (p: IconProps) => (
    <svg {...p} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 4 3 10 9 10" /><path d="M3.5 14a9 9 0 102.1-9.4L3 10" />
    </svg>
  ),
  wheelchair: (p: IconProps) => (
    <svg {...p} width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm9 7h-6l-1 5-2 8h-2l-2-8-1-5H1V7h20v2z" />
    </svg>
  ),
};

export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(defaults);
  const [announcement, setAnnouncement] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);
  useDialogA11y(open, panelRef, close);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
      const merged = { ...defaults, ...saved };
      setPrefs(merged);
      applyPrefs(merged);
    } catch {
      // corrupt or unavailable storage — fall back to defaults
    }
  }, []);

  function update(patch: Partial<Prefs>, message: string) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    applyPrefs(next);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    setAnnouncement(message);
  }

  function reset() {
    setPrefs(defaults);
    applyPrefs(defaults);
    try {
      localStorage.removeItem(PREFS_KEY);
    } catch {
      // ignore
    }
    setAnnouncement("הגדרות הנגישות אופסו");
  }

  function changeFont(delta: number) {
    const next = Math.min(Math.max(prefs.fontStep + delta, 0), FONT_STEPS.length - 1);
    if (next === prefs.fontStep) {
      setAnnouncement(delta > 0 ? "הגעת לגודל הטקסט המרבי" : "הגעת לגודל הטקסט המזערי");
      return;
    }
    update({ fontStep: next }, `גודל טקסט ${Math.round(FONT_STEPS[next] * 100)} אחוז`);
  }

  const toggles: { key: keyof Omit<Prefs, "fontStep">; label: string; Icon: (p: IconProps) => React.JSX.Element }[] = [
    { key: "grayscale", label: "גווני אפור", Icon: icons.grayscale },
    { key: "contrast", label: "ניגודיות גבוהה", Icon: icons.contrast },
    { key: "invert", label: "ניגודיות הפוכה", Icon: icons.invert },
    { key: "lightBg", label: "רקע בהיר", Icon: icons.lightBg },
    { key: "highlightLinks", label: "הדגשת קישורים", Icon: icons.link },
    { key: "readableFont", label: "פונט קריא", Icon: icons.font },
    { key: "noMotion", label: "עצירת אנימציות", Icon: icons.motion },
  ];

  const rowBase =
    "w-full flex items-center justify-between gap-3 rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition-colors";
  const activeStyle = { background: "var(--text)", color: "var(--cream)", borderColor: "var(--text)" };
  const idleStyle = { background: "transparent", color: "var(--text)", borderColor: "var(--border)" };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* Changes are silent otherwise — a screen-reader user gets no feedback
          that grayscale or a larger text size actually took effect. */}
      <p aria-live="polite" className="sr-only">{announcement}</p>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="a11y-panel-title"
          className="rounded-2xl border-2 p-4 flex flex-col gap-2 w-64 shadow-xl max-h-[75vh] overflow-y-auto"
          style={{ background: "var(--cream-dark)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <button
              onClick={close}
              aria-label="סגור תפריט נגישות"
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-60 transition-opacity"
              style={{ color: "var(--text)" }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <h2 id="a11y-panel-title" className="font-extrabold text-base" style={{ color: "var(--text)" }}>
              כלי נגישות
            </h2>
          </div>

          <button onClick={() => changeFont(1)} className={rowBase} style={idleStyle}>
            <icons.zoomIn />
            <span>הגדל טקסט</span>
          </button>
          <button onClick={() => changeFont(-1)} className={rowBase} style={idleStyle}>
            <icons.zoomOut />
            <span>הקטן טקסט</span>
          </button>
          <p className="text-xs text-left -mt-1 mb-1" style={{ color: "var(--text-muted)" }}>
            גודל נוכחי: {Math.round(FONT_STEPS[prefs.fontStep] * 100)}%
          </p>

          {toggles.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => update({ [key]: !prefs[key] }, `${label} ${prefs[key] ? "כבוי" : "פעיל"}`)}
              aria-pressed={prefs[key]}
              className={rowBase}
              style={prefs[key] ? activeStyle : idleStyle}
            >
              <Icon />
              <span>{label}</span>
            </button>
          ))}

          <button onClick={reset} className={rowBase} style={idleStyle}>
            <icons.reset />
            <span>איפוס</span>
          </button>

          <a
            href="/accessibility"
            className="text-xs text-center underline underline-offset-2 mt-1 hover:opacity-70"
            style={{ color: "var(--text-muted)" }}
          >
            הצהרת נגישות
          </a>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="תפריט נגישות"
        aria-expanded={open}
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 border-2"
        style={{
          background: open ? "var(--text)" : "var(--cream-dark)",
          borderColor: "var(--text)",
          color: open ? "var(--cream)" : "var(--text)",
        }}
      >
        <icons.wheelchair />
      </button>
    </div>
  );
}
