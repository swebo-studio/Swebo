"use client";
import { useState } from "react";
import Image from "next/image";

interface SizeRow {
  size: string;
  chest: number;
  waist: number;
  length: number;
}

interface Props {
  rows: SizeRow[];
  imagePath?: string;
  imagePaths?: string[];
}

export default function SizeChartModal({ rows, imagePath, imagePaths }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"guide" | "table">("guide");
  const [imgIndex, setImgIndex] = useState(0);

  const images = imagePaths && imagePaths.length > 0
    ? imagePaths
    : imagePath ? [imagePath] : ["/size-guide.png"];

  // Always show — image guide works even without a measurements table
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm underline underline-offset-2 transition-opacity hover:opacity-70"
        style={{ color: "var(--text-muted)" }}
      >
        מדריך מידות
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl overflow-hidden flex flex-col"
            style={{ background: "var(--cream)", maxHeight: "90vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: "var(--border)" }}>
              <button onClick={() => setOpen(false)} aria-label="סגור" className="text-xl opacity-40 hover:opacity-100 transition-opacity">✕</button>
              <h3 className="font-extrabold" style={{ color: "var(--text)" }}>מדריך מידות</h3>
            </div>

            {/* Tabs — only show if we also have a measurements table */}
            {rows.length > 0 && (
              <div className="flex border-b flex-shrink-0 overflow-hidden" style={{ borderColor: "var(--border)" }}>
                {([
                  { key: "guide", label: "מדריך" },
                  { key: "table", label: 'מידות (ס"מ)' },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className="flex-1 min-w-0 py-2.5 text-sm font-bold transition-colors truncate px-2"
                    style={{
                      color: tab === key ? "var(--text)" : "var(--text-muted)",
                      borderBottom: tab === key ? "2px solid var(--text)" : "2px solid transparent",
                      background: "transparent",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Content */}
            <div className="overflow-y-auto flex-1">
              {tab === "guide" && (
                <div className="p-3">
                  <div className="relative w-full rounded-xl overflow-hidden" style={{ background: "#fff" }}>
                    <Image
                      src={images[imgIndex] ?? "/size-guide.png"}
                      alt="מדריך מידות"
                      width={600}
                      height={900}
                      className="w-full h-auto"
                      priority
                    />
                  </div>
                  {images.length > 1 && (
                    <div className="flex items-center justify-between mt-3 px-1">
                      <button
                        onClick={() => setImgIndex((i) => Math.min(i + 1, images.length - 1))}
                        disabled={imgIndex === images.length - 1}
                        className="p-1.5 rounded-lg border disabled:opacity-30 transition-opacity hover:opacity-70"
                        style={{ borderColor: "var(--border)", color: "var(--text)" }}
                        aria-label="תמונה הבאה"
                      >
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
                      </button>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {imgIndex + 1} / {images.length}
                      </span>
                      <button
                        onClick={() => setImgIndex((i) => Math.max(i - 1, 0))}
                        disabled={imgIndex === 0}
                        className="p-1.5 rounded-lg border disabled:opacity-30 transition-opacity hover:opacity-70"
                        style={{ borderColor: "var(--border)", color: "var(--text)" }}
                        aria-label="תמונה קודמת"
                      >
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {tab === "table" && rows.length > 0 && (
                <div className="p-4">
                  <table className="w-full text-sm text-center">
                    <thead>
                      <tr style={{ color: "var(--text-muted)" }}>
                        <th className="py-2 font-medium">מידה</th>
                        <th className="py-2 font-medium">חזה</th>
                        <th className="py-2 font-medium">מותן</th>
                        <th className="py-2 font-medium">אורך</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.size} className="border-t" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
                          <td className="py-2.5 font-bold">{r.size}</td>
                          <td className="py-2.5">{r.chest}</td>
                          <td className="py-2.5">{r.waist}</td>
                          <td className="py-2.5">{r.length}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-xs text-center mt-3" style={{ color: "var(--text-muted)" }}>המידות ניתנות לשינוי</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
