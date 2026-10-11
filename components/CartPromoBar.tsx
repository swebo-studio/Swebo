"use client";
import { useState, useEffect, useRef } from "react";
import { useCart } from "./CartProvider";
import { useReducedMotion } from "@/lib/useReducedMotion";
import type { AppliedReward, PotentialReward } from "@/lib/promotions";

const items = (n: number) => (n === 1 ? "פריט אחד" : `${n} פריטים`);
const gift = (pct?: number) => (pct === 100 ? "חינם" : `ב-${pct}% הנחה`);

function rewardLabel(r: AppliedReward): string {
  if (r.type === "free_shipping") return "משלוח חינם";
  if (r.type === "bundle") return `${r.buyQuantity} פריטים ${r.buyFrom ? `${r.buyFrom} ` : ""}ב-₪${r.bundlePrice}`;
  if (r.type === "buy_get") return `${items(r.getQuantity ?? 1)} ${r.getFrom ?? "מהמבצע"} ${gift(r.discountPct)}`;
  if (r.type === "cart_discount") {
    return r.discountAmount ? `₪${r.discountAmount} הנחה על כל הסל` : `${r.discountPct}% הנחה על כל הסל`;
  }
  const scope = !r.maxUnits ? "" : r.maxUnits === 1 ? " (פריט אחד)" : ` (עד ${r.maxUnits} פריטים)`;
  return r.discountPct === 100
    ? `${r.productName} חינם${scope}`
    : `${r.discountPct}% הנחה על ${r.productName}${scope}`;
}

function potentialLabel(p: PotentialReward): string {
  if (p.kind === "spend_more") return `עוד ₪${p.remaining} בעגלה ותקבל ${rewardLabel(p.reward)}`;
  const { reward } = p;
  if (p.kind === "add_items") {
    const more = `הוסף עוד ${items(p.missing ?? 1)} ${reward.buyFrom ?? "מהמבצע"}`;
    return reward.type === "bundle"
      ? `${more} — ${reward.buyQuantity} ב-₪${reward.bundlePrice}`
      : `${more} וקבל ${rewardLabel(reward)}`;
  }
  if (p.kind === "add_get_item") return `הוסף ${items(reward.getQuantity ?? 1)} ${reward.getFrom ?? "מהמבצע"} לעגלה וקבל ${gift(reward.discountPct)}`;
  return reward.discountPct === 100
    ? `הוסף ${reward.productName} לעגלה וקבל חינם`
    : `הוסף ${reward.productName} לעגלה וקבל ${reward.discountPct}% הנחה`;
}

/**
 * Thin bar under the header that tells the shopper, from the moment the cart
 * has something in it, which promotion is already cutting their price and
 * which one is still within reach.
 */
export default function CartPromoBar() {
  const { promotions: { applied, potential } } = useCart();
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = useReducedMotion();

  const messages = [
    ...applied.map((r) => ({ text: `ההנחה שלך פעילה — ${rewardLabel(r)}`, active: true })),
    ...potential.map((p) => ({ text: potentialLabel(p), active: false })),
  ];

  // Keep the rotation in range when the cart (and so the message list) changes
  useEffect(() => { setIdx(0); setVisible(true); }, [messages.length]);

  const rotating = messages.length > 1 && !paused && !reducedMotion;

  useEffect(() => {
    if (!rotating) return;
    timer.current = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % messages.length);
        setVisible(true);
      }, 300);
    }, 4000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [rotating, messages.length]);

  if (messages.length === 0) return null;

  const current = messages[idx] ?? messages[0];
  const anyActive = applied.length > 0;

  return (
    <section
      aria-label="מבצעים על העגלה"
      className="w-full py-2 px-4 text-center text-sm font-bold overflow-hidden flex items-center justify-center gap-2"
      style={{ background: anyActive ? "var(--green)" : "var(--maroon)", color: "var(--cream)" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* Announce the discounts that are actually live, once, when they change.
          The old aria-live sat on the rotating text, so a screen reader read a
          fresh promo line out loud every four seconds for the whole session. */}
      <p aria-live="polite" className="sr-only">
        {applied.map(rewardLabel).join(", ")}
      </p>

      {/* Every message sits in the same grid cell, invisible but for the
          current one, so the bar is always as tall as its longest message and
          the page no longer jumps when a short line rotates in after a long one. */}
      <span className="grid">
        {messages.map((m, i) => i !== idx && (
          <span key={i} aria-hidden="true" className="invisible inline-flex items-center justify-center gap-2" style={{ gridArea: "1 / 1" }}>
            <span className="w-[15px] flex-shrink-0" />
            {m.text}
          </span>
        ))}
        <span
          aria-hidden={rotating}
          className="inline-flex items-center justify-center gap-2 transition-opacity duration-300"
          style={{ opacity: visible ? 1 : 0, gridArea: "1 / 1" }}
        >
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className="flex-shrink-0" aria-hidden="true">
            {current.active ? (
              <>
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </>
            ) : (
              <>
                <polyline points="20 12 20 22 4 22 4 12" />
                <rect x="2" y="7" width="20" height="5" />
                <line x1="12" y1="22" x2="12" y2="7" />
                <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" />
                <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
              </>
            )}
          </svg>
          {current.text}
        </span>
      </span>

      {messages.length > 1 && !reducedMotion && (
        <button
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? "הפעל החלפת מבצעים" : "עצור החלפת מבצעים"}
          className="flex-shrink-0 opacity-80 hover:opacity-100 transition-opacity"
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
