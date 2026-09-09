import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function focusableWithin(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement
  );
}

/**
 * The three things every modal owes a keyboard or screen-reader user, and that
 * none of ours did: Escape closes it, Tab stays inside it, and focus goes back
 * to whatever opened it. Without the trap, tabbing past the last control walks
 * into the page behind the overlay — which is still rendered, still clickable
 * by keyboard, and invisible to a sighted user who cannot see where focus went.
 *
 * Pair with `useDrawerScrollLock` when the dialog covers the page.
 */
export function useDialogA11y(
  open: boolean,
  dialogRef: RefObject<HTMLElement | null>,
  onClose: () => void
) {
  // Kept in a ref so a re-render between open and close cannot lose the opener.
  const openerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    openerRef.current = document.activeElement as HTMLElement | null;

    // Focus the first control, falling back to the dialog itself so the
    // announcement starts at the dialog's label rather than at the page top.
    const first = focusableWithin(dialog)[0];
    if (first) {
      first.focus();
    } else {
      dialog.setAttribute("tabindex", "-1");
      dialog.focus();
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;

      const node = dialogRef.current;
      if (!node) return;
      const items = focusableWithin(node);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const active = document.activeElement;

      if (!node.contains(active)) {
        e.preventDefault();
        firstItem.focus();
      } else if (e.shiftKey && active === firstItem) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && active === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    }

    document.addEventListener("keydown", handleKey, true);
    return () => {
      document.removeEventListener("keydown", handleKey, true);
      // Only pull focus back if it is still somewhere in the closing dialog;
      // a link inside it may have moved focus on purpose.
      const opener = openerRef.current;
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [open, dialogRef]);
}
