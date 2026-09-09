"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";

// Distance from the viewport edge where a drag starts scrolling the page, and
// the top speed it scrolls at (px per frame).
const EDGE = 72;
const MAX_SPEED = 16;

export interface DragHandleProps {
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onLostPointerCapture: () => void;
  onKeyDown: (e: ReactKeyboardEvent<HTMLElement>) => void;
  style: CSSProperties;
  "aria-label": string;
}

interface DragState {
  from: number;
  to: number;
  dy: number;
  height: number;
}

interface Live {
  rects: { top: number; height: number }[];
  from: number;
  to: number;
  startPageY: number;
  clientY: number;
}

interface DragListProps<T> {
  items: T[];
  keyOf: (item: T) => string;
  /** Called with the full list in its new order once a drag (or arrow key) settles. */
  onReorder: (next: T[]) => void;
  /** Vertical gap between rows, so neighbours shift by the right amount. */
  gap?: number;
  className?: string;
  handleLabel?: string;
  children: (args: { item: T; index: number; dragging: boolean; handle: DragHandleProps }) => ReactNode;
}

export default function DragList<T>({
  items,
  keyOf,
  onReorder,
  gap = 8,
  className,
  handleLabel = "גרור לשינוי סדר",
  children,
}: DragListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  // Transitions are muted for the frame in which the list re-orders, so rows do
  // not animate back from the offsets the drag gave them.
  const [settling, setSettling] = useState(false);
  const live = useRef<Live | null>(null);
  const rafRef = useRef<number | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  // Positions are measured once at drag start and kept in page coordinates, so
  // auto-scrolling mid-drag does not throw the target index off.
  const apply = useCallback(() => {
    const s = live.current;
    if (!s) return;
    const dy = s.clientY + window.scrollY - s.startPageY;
    const center = s.rects[s.from].top + s.rects[s.from].height / 2 + dy;
    let to = s.from;
    for (let i = 0; i < s.rects.length; i++) {
      if (i === s.from) continue;
      const c = s.rects[i].top + s.rects[i].height / 2;
      if (i < s.from && center < c) to = Math.min(to, i);
      else if (i > s.from && center > c) to = Math.max(to, i);
    }
    s.to = to;
    setDrag((prev) =>
      prev && prev.to === to && prev.dy === dy ? prev : { from: s.from, to, dy, height: s.rects[s.from].height }
    );
  }, []);

  const step = useCallback(() => {
    const s = live.current;
    if (!s) return;
    const h = window.innerHeight;
    let d = 0;
    if (s.clientY < EDGE) d = -MAX_SPEED * (1 - s.clientY / EDGE);
    else if (s.clientY > h - EDGE) d = MAX_SPEED * (1 - (h - s.clientY) / EDGE);
    if (d) window.scrollBy(0, d);
    apply();
    rafRef.current = requestAnimationFrame(step);
  }, [apply]);

  const end = useCallback(
    (commit: boolean) => {
      const s = live.current;
      live.current = null;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setDrag(null);
      if (!s || !commit || s.to === s.from) return;
      const next = [...itemsRef.current];
      const [moved] = next.splice(s.from, 1);
      next.splice(s.to, 0, moved);
      setSettling(true);
      requestAnimationFrame(() => setSettling(false));
      onReorder(next);
    },
    [onReorder]
  );

  const moveBy = useCallback(
    (index: number, delta: number) => {
      const target = index + delta;
      if (target < 0 || target >= itemsRef.current.length) return;
      const next = [...itemsRef.current];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      onReorder(next);
    },
    [onReorder]
  );

  const handleProps = (index: number): DragHandleProps => ({
    onPointerDown: (e) => {
      if (e.button !== 0) return;
      const el = containerRef.current;
      if (!el || itemsRef.current.length < 2) return;
      e.preventDefault();
      const rects = Array.from(el.children).map((c) => {
        const b = c.getBoundingClientRect();
        return { top: b.top + window.scrollY, height: b.height };
      });
      live.current = {
        rects,
        from: index,
        to: index,
        startPageY: e.clientY + window.scrollY,
        clientY: e.clientY,
      };
      // Capture keeps the move/up events on the handle even when the pointer
      // outruns it; not every environment has a capturable pointer, so a
      // failure here must not abort the drag.
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      setDrag({ from: index, to: index, dy: 0, height: rects[index].height });
      rafRef.current = requestAnimationFrame(step);
    },
    onPointerMove: (e) => {
      const s = live.current;
      if (!s) return;
      s.clientY = e.clientY;
      apply();
    },
    onPointerUp: () => end(true),
    onPointerCancel: () => end(false),
    onLostPointerCapture: () => end(true),
    onKeyDown: (e) => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      e.preventDefault();
      moveBy(index, e.key === "ArrowUp" ? -1 : 1);
    },
    style: { touchAction: "none", cursor: drag ? "grabbing" : "grab" },
    "aria-label": handleLabel,
  });

  return (
    <div ref={containerRef} className={className}>
      {items.map((item, i) => {
        const dragging = drag?.from === i;
        let translate = 0;
        if (drag && !dragging) {
          // Everything between the row's old and new slot slides over by the
          // gap the dragged row left behind.
          if (drag.from < drag.to && i > drag.from && i <= drag.to) translate = -(drag.height + gap);
          else if (drag.from > drag.to && i >= drag.to && i < drag.from) translate = drag.height + gap;
        } else if (dragging) {
          translate = drag!.dy;
        }
        return (
          <div
            key={keyOf(item)}
            style={{
              position: "relative",
              zIndex: dragging ? 20 : undefined,
              transform: translate ? `translateY(${translate}px)` : undefined,
              transition: dragging || settling ? "none" : "transform 160ms cubic-bezier(.2,.8,.2,1)",
              willChange: drag ? "transform" : undefined,
            }}
          >
            {children({ item, index: i, dragging, handle: handleProps(i) })}
          </div>
        );
      })}
    </div>
  );
}

export function DragHandle({ handle, size = 16 }: { handle: DragHandleProps; size?: number }) {
  const { style, ...rest } = handle;
  return (
    <button
      type="button"
      {...rest}
      // Comfortably tappable on a phone without making the row taller.
      style={{ ...style, color: "var(--text-muted)", minWidth: size + 18, minHeight: size + 18 }}
      className="flex items-center justify-center rounded-md hover:opacity-70 select-none"
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="9" cy="6" r="1.6" />
        <circle cx="15" cy="6" r="1.6" />
        <circle cx="9" cy="12" r="1.6" />
        <circle cx="15" cy="12" r="1.6" />
        <circle cx="9" cy="18" r="1.6" />
        <circle cx="15" cy="18" r="1.6" />
      </svg>
    </button>
  );
}
