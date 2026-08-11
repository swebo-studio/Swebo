"use client";
import { useState, useEffect, useRef } from "react";
import { useCart } from "./CartProvider";
import type { AppliedReward, PotentialReward } from "@/lib/promotions";

function rewardLabel(r: AppliedReward): string {
  if (r.type === "free_shipping") return "משלוח חינם";
  if (r.type === "cart_discount") {
    return r.discountAmount ? `₪${r.discountAmount} הנחה על כל הסל` : `${r.discountPct}% הנחה על כל הסל`;
  }
  return r.discountPct === 100 ? `${r.productName} חינם` : `${r.discountPct}% הנחה על ${r.productName}`;
}

function potentialLabel(p: PotentialReward): string {
  if (p.kind === "spend_more") return `עוד ₪${p.remaining} בעגלה ותקבל ${rewardLabel(p.reward)}`;
  const { reward } = p;
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
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messages = [
    ...applied.map((r) => ({ text: `ההנחה שלך פעילה — ${rewardLabel(r)}`, active: true })),
    ...potential.map((p) => ({ text: potentialLabel(p), active: false })),
  ];

  // Keep the rotation in range when the cart (and so the message list) changes
  useEffect(() => { setIdx(0); setVisible(true); }, [messages.length]);

  useEffect(() => {
    if (messages.length <= 1) return;
    timer.current = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % messages.length);
        setVisible(true);
      }, 300);
    }, 4000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [messages.length]);

  if (messages.length === 0) return null;

  const current = messages[idx] ?? messages[0];
  const anyActive = applied.length > 0;

  return (
    <div
      className="w-full py-2 px-4 text-center text-sm font-bold overflow-hidden"
      style={{ background: anyActive ? "var(--green)" : "var(--maroon)", color: "var(--cream)" }}
      aria-live="polite"
    >
      <span
        className="inline-flex items-center gap-2 transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
      >
        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className="flex-shrink-0">
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
    </div>
  );
}
