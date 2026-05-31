"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import AdminLogoutButton from "@/components/AdminLogoutButton";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/admin",          label: "לוח בקרה" },
  { href: "/admin/products", label: "מוצרים" },
  { href: "/admin/orders",   label: "הזמנות" },
  { href: "/admin/coupons",  label: "קופונים" },
  { href: "/admin/config",   label: "הגדרות" },
  { href: "/",               label: "החנות" },
];

function AdminNav({ onClose }: { onClose?: () => void }) {
  return (
    <>
      <div className="flex justify-center mb-8">
        <Image src="/logo.png" alt="SWEBO" width={90} height={45} className="object-contain" />
      </div>
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onClose}
          className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors hover:opacity-70 text-right"
          style={{ color: "var(--text)" }}
        >
          {item.label}
        </Link>
      ))}
      <div className="mt-auto">
        <AdminLogoutButton />
      </div>
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Login page — no sidebar
  if (pathname === "/admin/login") return <>{children}</>;

  return (
    <div className="min-h-screen flex" style={{ background: "var(--cream)" }}>

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex w-56 flex-col border-l py-8 px-4 gap-2 sticky top-0 h-screen"
        style={{ background: "var(--cream-dark)", borderColor: "var(--border)" }}
      >
        <AdminNav />
      </aside>

      {/* Mobile top bar */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 border-b"
        style={{ background: "var(--cream-dark)", borderColor: "var(--border)" }}
      >
        <button
          onClick={() => setOpen(true)}
          aria-label="פתח תפריט"
          className="p-2 rounded-lg"
          style={{ color: "var(--text)" }}
        >
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="19" y2="6" />
            <line x1="3" y1="12" x2="19" y2="12" />
            <line x1="3" y1="18" x2="19" y2="18" />
          </svg>
        </button>
        <Image src="/logo.png" alt="SWEBO" width={70} height={35} className="object-contain" />
        <div className="w-9" /> {/* spacer */}
      </div>

      {/* Mobile drawer overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 flex"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <aside
            className="relative ml-auto w-64 h-full flex flex-col py-8 px-4 gap-2 border-l"
            style={{ background: "var(--cream-dark)", borderColor: "var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-xl opacity-50 hover:opacity-100"
              aria-label="סגור"
            >
              ✕
            </button>
            <AdminNav onClose={() => setOpen(false)} />
          </aside>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 p-4 md:p-8 overflow-auto text-right mt-20 md:mt-0">{children}</main>
    </div>
  );
}
