"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useDialogA11y } from "@/lib/useDialogA11y";
import { useDrawerScrollLock } from "@/lib/useDrawerScrollLock";
import { POPUP_CONFIRM_LABEL, popupAckKey, type PublicPopup } from "@/lib/popups";
import { settleSitePopups } from "@/lib/sitePopupGate";

function store(p: PublicPopup): Storage | null {
  try {
    return p.frequency === "once" ? localStorage : sessionStorage;
  } catch {
    return null;
  }
}

function acknowledged(p: PublicPopup): boolean {
  try {
    return store(p)?.getItem(popupAckKey(p)) === "1";
  } catch {
    return false;
  }
}

const noop = () => {};

/**
 * The admin's popups, one after another, over the storefront. Each one stays
 * until the visitor presses "קראתי ואני מאשר" — no ✕, no Escape, no click
 * outside. "visit" popups come back on the next visit (new browser session);
 * "once" popups never come back to that browser.
 */
export default function SitePopups() {
  const pathname = usePathname();
  const [queue, setQueue] = useState<PublicPopup[]>([]);
  const current = queue[0] ?? null;

  const loaded = useRef(false);
  const onAdmin = pathname.startsWith("/admin");

  useEffect(() => {
    // Admin screens: nothing yet, but load once the visitor reaches the store
    // (the layout stays mounted across client navigation, so this runs once
    // per page load on the first storefront path).
    if (onAdmin || loaded.current) return;
    loaded.current = true;
    // The holding page shown while the store is closed
    if (document.querySelector("[data-site-closed]")) {
      settleSitePopups();
      return;
    }
    fetch("/api/popups")
      .then((r) => (r.ok ? r.json() : []))
      .then((popups: PublicPopup[]) => {
        const pending = Array.isArray(popups) ? popups.filter((p) => !acknowledged(p)) : [];
        if (pending.length === 0) settleSitePopups();
        setQueue(pending);
      })
      .catch(() => settleSitePopups());
  }, [onAdmin]);

  if (!current || onAdmin) return null;

  function confirm() {
    try { store(current!)?.setItem(popupAckKey(current!), "1"); } catch { /* storage blocked */ }
    setQueue((q) => {
      const rest = q.slice(1);
      if (rest.length === 0) settleSitePopups();
      return rest;
    });
  }

  return <PopupDialog key={current.id} popup={current} onConfirm={confirm} />;
}

/** The SWEBO wordmark between two rules, as on the store's printed material */
function Wordmark() {
  return (
    <div className="flex items-center justify-center gap-4 mb-3" aria-hidden="true">
      <span className="h-px w-12 sm:w-16" style={{ background: "var(--text)" }} />
      <div className="text-center leading-none" dir="ltr">
        <p className="text-2xl font-extrabold italic tracking-tight" style={{ color: "var(--text)" }}>SWEBO</p>
        <p className="text-[9px] font-bold tracking-[0.3em] mt-1" style={{ color: "var(--text)" }}>BUILD ON UNIQUENESS</p>
      </div>
      <span className="h-px w-12 sm:w-16" style={{ background: "var(--text)" }} />
    </div>
  );
}

/** One popup, centred over the page. Also the admin's preview. */
export function PopupDialog({
  popup,
  onConfirm,
}: {
  popup: Pick<PublicPopup, "id" | "title" | "subtitle" | "text" | "image">;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  useDialogA11y(true, dialogRef, noop);
  useDrawerScrollLock(true, scrollRef);

  const titleId = `site-popup-title-${popup.id}`;
  const textId = `site-popup-text-${popup.id}`;
  const describedBy = [popup.subtitle && `${textId}-sub`, popup.text && textId].filter(Boolean).join(" ") || undefined;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={popup.title ? titleId : undefined}
        aria-label={popup.title ? undefined : "הודעה חשובה"}
        aria-describedby={describedBy}
        className="w-full max-w-md rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ background: "var(--cream)", maxHeight: "calc(100dvh - 2rem)" }}
      >
        <div ref={scrollRef} className="overflow-y-auto overscroll-contain flex-1 min-h-0 px-5 pt-6 pb-2 text-center">
          <Wordmark />
          {popup.title && (
            <h2 id={titleId} dir="auto" className="text-3xl sm:text-4xl font-extrabold leading-tight" style={{ color: "var(--text)" }}>
              {popup.title}
            </h2>
          )}
          {popup.subtitle && (
            <p id={`${textId}-sub`} dir="auto" className="text-sm sm:text-base mt-1.5" style={{ color: "var(--text)" }}>
              {popup.subtitle}
            </p>
          )}
          {popup.image && (
            <Image
              src={popup.image}
              alt={popup.title || "הודעה"}
              width={900}
              height={1200}
              sizes="(max-width: 480px) 90vw, 408px"
              className="w-full h-auto block rounded-2xl mt-4"
              priority
            />
          )}
          {popup.text && (
            <p id={textId} dir="auto" className="whitespace-pre-line leading-relaxed break-words mt-4" style={{ color: "var(--text)" }}>
              {popup.text}
            </p>
          )}
        </div>
        <div className="px-5 pb-5 pt-3 flex-shrink-0 text-center">
          <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>יש לאשר קריאה כדי להמשיך באתר</p>
          <button
            type="button"
            onClick={onConfirm}
            className="w-full py-3.5 rounded-xl text-lg font-bold transition-opacity hover:opacity-85"
            style={{ background: "var(--text)", color: "var(--cream)" }}
          >
            {POPUP_CONFIRM_LABEL}
          </button>
        </div>
      </div>
    </div>
  );
}
