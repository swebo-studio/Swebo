"use client";
import { signOut } from "next-auth/react";

export default function AdminLogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/admin-login" })}
      className="w-full px-4 py-2.5 rounded-xl text-sm font-medium text-right transition-opacity hover:opacity-70"
      style={{ color: "var(--text-muted)" }}
    >
      🚪 התנתק
    </button>
  );
}
