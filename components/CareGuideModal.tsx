"use client";
import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { useDialogA11y } from "@/lib/useDialogA11y";
import { useDrawerScrollLock } from "@/lib/useDrawerScrollLock";

/** The "הוראות כביסה" link beside "מדריך מידות", opening the care image. */
export default function CareGuideModal({ image }: { image: string }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDialogA11y(open, dialogRef, close);
  useDrawerScrollLock(open, scrollRef);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="text-sm underline underline-offset-2 transition-opacity hover:opacity-70"
        style={{ color: "var(--text-muted)" }}
      >
        הוראות כביסה
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={close}>
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="care-guide-title"
            className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
            style={{ background: "var(--cream)", maxHeight: "90dvh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: "var(--border)" }}>
              <button onClick={close} aria-label="סגור הוראות כביסה" className="text-xl opacity-60 hover:opacity-100 transition-opacity">
                <span aria-hidden="true">✕</span>
              </button>
              <h2 id="care-guide-title" className="font-extrabold" style={{ color: "var(--text)" }}>הוראות כביסה</h2>
            </div>
            <div ref={scrollRef} className="overflow-y-auto overscroll-contain flex-1 min-h-0 p-3">
              <div className="w-full rounded-xl overflow-hidden" style={{ background: "#fff" }}>
                <Image
                  src={image}
                  alt="הוראות כביסה"
                  width={1000}
                  height={1000}
                  sizes="(max-width: 540px) 100vw, 512px"
                  className="w-full h-auto"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
