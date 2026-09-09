"use client";
import { useState, useEffect, useRef } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";

interface AnnouncementItem {
  text: string;
  url?: string;
}

interface Props {
  items: AnnouncementItem[];
}

export default function AnnouncementBar({ items }: Props) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const reducedMotion = useReducedMotion();

  // WCAG 2.2.2: anything that moves on its own for more than five seconds
  // needs a way to stop it — hover, keyboard focus, the pause button, or the
  // visitor's reduced-motion setting all halt the rotation here.
  const rotating = items.length > 1 && !paused && !reducedMotion;

  useEffect(() => {
    if (!rotating) return;
    timer.current = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % items.length);
        setVisible(true);
      }, 300);
    }, 3500);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [rotating, items.length]);

  if (!items.length) return null;

  const current = items[idx];

  return (
    <section
      aria-label="הודעות האתר"
      className="w-full py-2 px-4 text-center text-sm font-medium overflow-hidden flex items-center justify-center gap-2"
      style={{ background: "#111", color: "var(--cream)" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* One live message rather than a hidden duplicate list: a second copy
          would either be read twice or take keyboard focus somewhere invisible.
          Pausing is what makes the rotation safe to read. */}
      <span
        className="inline-block transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
      >
        {current.url ? (
          <a
            href={current.url}
            className="underline underline-offset-2 hover:opacity-80 transition-opacity"
            style={{ color: "inherit" }}
          >
            {current.text}
          </a>
        ) : (
          current.text
        )}
      </span>

      {items.length > 1 && !reducedMotion && (
        <button
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? "הפעל החלפת הודעות" : "עצור החלפת הודעות"}
          className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
          style={{ color: "inherit" }}
        >
          {paused ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="6 3 20 12 6 21" /></svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
          )}
        </button>
      )}
    </section>
  );
}
