"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import AdminLogoutButton from "@/components/AdminLogoutButton";
import { useState } from "react";

const NAV_ITEMS = [
  {
    href: "/admin",
    label: "לוח בקרה",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    href: "/admin/products",
    label: "מוצרים",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    ),
  },
  {
    href: "/admin/orders",
    label: "הזמנות",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
        <rect x="9" y="3" width="6" height="4" rx="1"/>
        <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
      </svg>
    ),
  },
  {
    href: "/admin/coupons",
    label: "קופונים",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
        <line x1="7" y1="7" x2="7.01" y2="7"/>
      </svg>
    ),
  },
  {
    href: "/admin/promotions",
    label: "מבצעים",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
  },
  {
    href: "/admin/sms",
    label: "הודעות SMS",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    ),
  },
  {
    href: "/admin/newsletter",
    label: "נרשמים לקופון",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
  {
    href: "/admin/config",
    label: "הגדרות",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
      </svg>
    ),
  },
  {
    href: "/",
    label: "החנות",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
];

function AdminNav({ pathname, onClose }: { pathname: string; onClose?: () => void }) {
  return (
    <>
      <div className="flex justify-center mb-8">
        <Link href="/" onClick={onClose}>
          <Image src="/logo.png" alt="SWEBO" width={90} height={45} className="object-contain" />
        </Link>
      </div>
      {NAV_ITEMS.map((item) => {
        const isActive = item.href === "/admin"
          ? pathname === "/admin"
          : pathname.startsWith(item.href) && item.href !== "/";
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors hover:opacity-70 text-right"
            style={{
              color: "var(--text)",
              background: isActive ? "var(--cream)" : "transparent",
            }}
          >
            <span style={{ opacity: isActive ? 1 : 0.5 }}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
      <div className="mt-auto">
        <AdminLogoutButton />
      </div>
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (pathname === "/admin/login") return <>{children}</>;

  return (
    <div className="min-h-screen flex" style={{ background: "var(--cream)" }}>

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex w-56 flex-col border-l py-8 px-4 gap-2 sticky top-0 h-screen"
        style={{ background: "var(--cream-dark)", borderColor: "var(--border)" }}
      >
        <AdminNav pathname={pathname} />
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
        <Link href="/">
          <Image src="/logo.png" alt="SWEBO" width={70} height={35} className="object-contain" />
        </Link>
        <div className="w-9" />
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
              className="absolute top-4 right-4 p-1 opacity-50 hover:opacity-100"
              aria-label="סגור"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <AdminNav pathname={pathname} onClose={() => setOpen(false)} />
          </aside>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 p-4 md:p-8 overflow-auto text-right mt-20 md:mt-0">{children}</main>
    </div>
  );
}
