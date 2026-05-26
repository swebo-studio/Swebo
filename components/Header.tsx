"use client";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "./CartProvider";

export default function Header() {
  const { totalItems } = useCart();

  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{ background: "var(--cream)", borderColor: "var(--border)" }}
    >
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-6">

        {/* Left: Cart + nav links */}
        <div className="flex items-center gap-4">
          <Link href="/cart" className="relative p-2 hover:opacity-70 transition-opacity" aria-label="עגלת קניות">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
            {totalItems > 0 && (
              <span
                key={totalItems}
                className="cart-badge absolute -top-1 -left-1 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: "var(--maroon)" }}
              >
                {totalItems}
              </span>
            )}
          </Link>
          <Link
            href="/"
            className="text-sm font-medium hover:opacity-70 transition-opacity hidden sm:block"
            style={{ color: "var(--text)" }}
          >
            כל המוצרים
          </Link>
          <Link
            href="#contact"
            className="text-sm font-medium hover:opacity-70 transition-opacity hidden sm:block"
            style={{ color: "var(--text)" }}
          >
            צור קשר
          </Link>
        </div>

        {/* Centre: Logo image */}
        <Link href="/" className="flex-shrink-0">
          <Image
            src="/logo.png"
            alt="SWEBO"
            width={180}
            height={90}
            className="object-contain"
            style={{ maxHeight: 80 }}
            priority
          />
        </Link>

        {/* Right: spacer to balance layout */}
        <div className="flex items-center gap-4" style={{ minWidth: 120 }}>
          {/* Mobile: show links condensed */}
          <Link
            href="/"
            className="text-sm font-medium hover:opacity-70 transition-opacity sm:hidden"
            style={{ color: "var(--text)" }}
          >
            חנות
          </Link>
          <Link
            href="#contact"
            className="text-sm font-medium hover:opacity-70 transition-opacity sm:hidden"
            style={{ color: "var(--text)" }}
          >
            צור קשר
          </Link>
        </div>
      </div>
    </header>
  );
}
