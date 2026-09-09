"use client";
import { useEffect, useState } from "react";

interface Props {
  /** ISO timestamp the store reopens at. */
  reopenAt: string;
}

interface Parts { days: number; hours: number; minutes: number; seconds: number }

function remaining(target: number): Parts | null {
  const ms = target - Date.now();
  if (ms <= 0) return null;
  const total = Math.floor(ms / 1000);
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

export default function ClosedCountdown({ reopenAt }: Props) {
  const target = Date.parse(reopenAt);
  // The server and the visitor's clock never agree to the second, so the first
  // render stays empty and the real figures appear once mounted.
  const [parts, setParts] = useState<Parts | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (Number.isNaN(target)) return;
    setMounted(true);
    setParts(remaining(target));
    const id = setInterval(() => setParts(remaining(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!mounted || !parts) return null;

  const units: { value: number; label: string }[] = [
    { value: parts.days, label: "ימים" },
    { value: parts.hours, label: "שעות" },
    { value: parts.minutes, label: "דקות" },
    { value: parts.seconds, label: "שניות" },
  ];

  return (
    <div className="mt-10 w-full">
      <p className="text-xs tracking-widest mb-4 uppercase" style={{ color: "var(--text-muted)" }}>
        נפתחים מחדש בעוד
      </p>
      {/* One live region for the whole clock, announced politely so a screen
          reader is not read a new number every second. The boxes flex rather
          than hold a fixed width, so four of them still fit a 320px screen —
          and still fit once the accessibility widget scales the font up. */}
      <div className="flex justify-center gap-2 sm:gap-4" role="timer" aria-live="off">
        {units.map((u) => (
          <div
            key={u.label}
            className="rounded-2xl border py-3 sm:py-4 px-2 sm:px-4 flex-1 min-w-0 max-w-[96px]"
            style={{ borderColor: "var(--border)", background: "var(--cream-dark)" }}
          >
            <div className="text-2xl sm:text-3xl font-extrabold tabular-nums" style={{ color: "var(--text)" }}>
              {String(u.value).padStart(2, "0")}
            </div>
            <div className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>{u.label}</div>
          </div>
        ))}
      </div>
      <p className="sr-only">
        נפתחים מחדש בעוד {parts.days} ימים, {parts.hours} שעות ו-{parts.minutes} דקות
      </p>
    </div>
  );
}
