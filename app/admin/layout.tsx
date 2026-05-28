import { auth } from "@/lib/auth";
import Link from "next/link";
import Image from "next/image";
import AdminLogoutButton from "@/components/AdminLogoutButton";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // No session: middleware already redirects to /admin/login for protected routes.
  // For the login page itself, just render children without the sidebar.
  if (!session) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex" style={{ background: "var(--cream)" }}>
      {/* Sidebar */}
      <aside
        className="w-56 flex flex-col border-l py-8 px-4 gap-2 sticky top-0 h-screen"
        style={{ background: "var(--cream-dark)", borderColor: "var(--border)" }}
      >
        <div className="flex justify-center mb-8">
          <Image src="/logo.png" alt="SWEBO" width={90} height={45} className="object-contain" />
        </div>
        {[
          { href: "/admin", label: "לוח בקרה" },
          { href: "/admin/products", label: "מוצרים" },
          { href: "/admin/orders", label: "הזמנות" },
          { href: "/admin/coupons", label: "קופונים" },
          { href: "/admin/config", label: "הגדרות" },
          { href: "/", label: "החנות" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors hover:opacity-70 text-right"
            style={{ color: "var(--text)" }}
          >
            {item.label}
          </Link>
        ))}
        <div className="mt-auto">
          <AdminLogoutButton />
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 p-8 overflow-auto text-right">{children}</main>
    </div>
  );
}
