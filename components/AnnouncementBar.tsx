"use client";
import { useState, useEffect, useRef } from "react";

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
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (items.length <= 1) return;
    timer.current = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % items.length);
        setVisible(true);
      }, 300);
    }, 3500);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [items.length]);

  if (!items.length) return null;

  const current = items[idx];

  return (
    <div
      className="w-full py-2 px-4 text-center text-sm font-medium overflow-hidden"
      style={{ background: "#111", color: "var(--cream)" }}
    >
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
    </div>
  );
}
