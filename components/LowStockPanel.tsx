"use client";
import { useState } from "react";

interface LowStockEntry { id: string; nameHe: string; lines: string[] }

export default function LowStockPanel({ items }: { items: LowStockEntry[] }) {
  const [collapsed, setCollapsed] = useState(true);

  if (items.length === 0) return null;

  return (
    <div
      className="mb-8 rounded-2xl border overflow-hidden"
      style={{ background: "#fff3e0", borderColor: "#f59e0b" }}
    >
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full px-4 py-4 flex items-center justify-between transition-opacity hover:opacity-70"
      >
        <span className="text-sm" style={{ color: "#92400e" }}>{collapsed ? "הצג" : "הסתר"}</span>
        <span className="font-bold text-right" style={{ color: "#92400e" }}>מלאי נמוך</span>
      </button>

      {!collapsed && (
        <div className="flex flex-col gap-2 px-4 pb-4 text-right">
          {items.map((item) => (
            <div key={item.id}>
              <p className="text-sm font-semibold" style={{ color: "#92400e" }}>{item.nameHe}</p>
              {item.lines.map((line, i) => (
                <p key={i} className="text-xs mt-0.5" style={{ color: "#b45309" }}>{line}</p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
