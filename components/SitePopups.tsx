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

/** The store's logo, as in the site header */
function Logo() {
  return (
    <div className="flex justify-center mb-2" aria-hidden="true">
      <Image src="/logo.png" alt="" width={220} height={110} className="object-contain h-12 sm:h-14 w-auto" priority />
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
        <div ref={scrollRef} className="overflow-y-auto overscroll-contain flex-1 min-h-0 px-5 pt-5 pb-1 text-center">
          <Logo />
          {popup.title && (
            <h2 id={titleId} dir="auto" className="text-2xl sm:text-4xl font-extrabold leading-tight" style={{ color: "var(--text)" }}>
              {popup.title}
            </h2>
          )}
          {popup.subtitle && (
            <p id={`${textId}-sub`} dir="auto" className="text-sm sm:text-base mt-1" style={{ color: "var(--text)" }}>
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
              className="block w-auto h-auto max-w-full mx-auto rounded-2xl mt-3 object-contain"
              // A tall (story-sized) image would push the button off a phone
              // screen; cap it to the height left after the logo, title,
              // subtitle and button so the whole message fits without scrolling.
              style={{ maxHeight: "max(12rem, calc(100dvh - 19rem))" }}
              priority
            />
          )}
          {popup.text && (
            <p id={textId} dir="auto" className="whitespace-pre-line leading-relaxed break-words mt-4" style={{ color: "var(--text)" }}>
              {popup.text}
            </p>
          )}
        </div>
        <div className="px-5 pb-4 pt-2 flex-shrink-0 text-center">
          <p className="text-xs sm:text-sm mb-2" style={{ color: "var(--text-muted)" }}>יש לאשר קריאה כדי להמשיך באתר</p>
          <button
            type="button"
            onClick={onConfirm}
            className="w-full py-3 rounded-xl text-base sm:text-lg font-bold transition-opacity hover:opacity-85"
            style={{ background: "var(--text)", color: "var(--cream)" }}
          >
            {POPUP_CONFIRM_LABEL}
          </button>
        </div>
      </div>
    </div>
  );
}
