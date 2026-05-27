"use client";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "./CartProvider";
import { useState, useEffect, useRef } from "react";

interface Category { id: string; nameHe: string }

export default function Header() {
  const { totalItems } = useCart();
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then(setCategories).catch(() => {});
  }, []);

  // close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (open && drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // close on ESC
  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <header
        className="sticky top-0 z-50 border-b"
        style={{ background: "var(--cream)", borderColor: "var(--border)" }}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 grid grid-cols-3 items-center">

          {/* Right column (RTL start): hamburger */}
          <div style={{ justifySelf: "start" }}>
            <button
              onClick={() => setOpen(true)}
              aria-label="תפריט"
              className="p-2 rounded-xl hover:opacity-60 transition-opacity"
              style={{ color: "var(--text)" }}
            >
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="3" y1="6"  x2="21" y2="6"  />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>

          {/* Center: logo */}
          <div className="flex justify-center">
            <Link href="/" className="flex-shrink-0">
              <Image
                src="/logo.png"
                alt="SWEBO"
                width={220}
                height={110}
                className="object-contain"
                style={{ maxHeight: 90 }}
                priority
                loading="eager"
              />
            </Link>
          </div>

          {/* Left column (RTL end): cart */}
          <div className="flex items-center justify-end">
            <Link href="/cart" className="relative p-2 hover:opacity-70 transition-opacity" aria-label="עגלת קניות">
              <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
              {totalItems > 0 && (
                <span
                  className="cart-badge absolute -top-1 -right-1 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: "var(--maroon)" }}
                >
                  {totalItems}
                </span>
              )}
            </Link>
          </div>

        </div>
      </header>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar drawer — slides from the right (RTL start = physical right) */}
      <div
        ref={drawerRef}
        className="fixed top-0 right-0 h-full z-50 flex flex-col transition-transform duration-300"
        style={{
          width: 280,
          background: "var(--cream)",
          borderLeft: "1px solid var(--border)",
          transform: open ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <button onClick={() => setOpen(false)} aria-label="סגור תפריט" className="hover:opacity-60 transition-opacity" style={{ color: "var(--text)" }}>
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6"  y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <span className="font-extrabold text-base" style={{ color: "var(--text)" }}>תפריט</span>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col px-5 py-6 gap-1 text-right flex-1 overflow-y-auto">
          <Link href="/" onClick={() => setOpen(false)} className="py-3 px-2 font-bold text-base rounded-xl hover:opacity-60 transition-opacity" style={{ color: "var(--text)" }}>
            🏠 דף הבית
          </Link>

          {categories.length > 0 && (
            <>
              <div className="mt-4 mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>קטגוריות</div>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/?category=${cat.id}`}
                  onClick={() => setOpen(false)}
                  className="py-3 px-2 font-medium text-base rounded-xl hover:opacity-60 transition-opacity"
                  style={{ color: "var(--text)" }}
                >
                  {cat.nameHe}
                </Link>
              ))}
            </>
          )}

          <div className="mt-4 mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>עוד</div>
          <Link href="#contact" onClick={() => setOpen(false)} className="py-3 px-2 font-medium text-base rounded-xl hover:opacity-60 transition-opacity" style={{ color: "var(--text)" }}>
            💬 צור קשר
          </Link>
          <Link href="/terms" onClick={() => setOpen(false)} className="py-3 px-2 font-medium text-base rounded-xl hover:opacity-60 transition-opacity" style={{ color: "var(--text-muted)" }}>
            תנאי שימוש
          </Link>
          <Link href="/privacy" onClick={() => setOpen(false)} className="py-3 px-2 font-medium text-base rounded-xl hover:opacity-60 transition-opacity" style={{ color: "var(--text-muted)" }}>
            מדיניות פרטיות
          </Link>
        </nav>
      </div>
    </>
  );
}
