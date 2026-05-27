"use client";
import { useState } from "react";

interface SizeRow {
  size: string;
  chest: number;
  waist: number;
  length: number;
}

interface Props {
  rows: SizeRow[];
}

export default function SizeChartModal({ rows }: Props) {
  const [open, setOpen] = useState(false);

  if (rows.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm underline underline-offset-2 transition-opacity hover:opacity-70"
        style={{ color: "var(--text-muted)" }}
      >
        📏 טבלת מידות
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{ background: "var(--cream)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
              <button onClick={() => setOpen(false)} className="text-xl opacity-50 hover:opacity-100">✕</button>
              <h3 className="font-extrabold" style={{ color: "var(--text)" }}>טבלת מידות (ס&quot;מ)</h3>
            </div>
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
              <p className="text-xs text-center mt-3" style={{ color: "var(--text-muted)" }}>מידות באינץ׳ בקרוב. המידות ניתנות לשינוי.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
