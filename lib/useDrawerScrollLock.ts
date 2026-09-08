import { useEffect, type RefObject } from "react";

/**
 * Freezes the page while a drawer is open.
 *
 * Without it a touch drag on mobile — one starting on the drawer's own chrome,
 * or continuing past the end of its list — scrolls the document instead of the
 * menu. `overflow: hidden` covers wheel and Android touch while leaving the
 * scroll position (and any sticky header) untouched; pinning the body with
 * `position: fixed` would drop such a header out of its sticky context. iOS
 * Safari ignores the overflow for touch, so a touchmove outside `scrollableRef`
 * is cancelled outright. Pair it with `overscroll-contain` on that element so
 * the list does not chain its scroll to the page once it hits either end.
 */
export function useDrawerScrollLock(open: boolean, scrollableRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const { body } = document;
    const previous = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = "hidden";
    // Keep the scrollbar gutter so the page does not jump sideways on desktop.
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    function blockOutsideScroll(e: TouchEvent) {
      const list = scrollableRef.current;
      if (list && list.contains(e.target as Node)) return;
      e.preventDefault();
    }
    document.addEventListener("touchmove", blockOutsideScroll, { passive: false });

    return () => {
      body.style.overflow = previous.overflow;
      body.style.paddingRight = previous.paddingRight;
      document.removeEventListener("touchmove", blockOutsideScroll);
    };
  }, [open, scrollableRef]);
}
