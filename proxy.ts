import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// In Next.js 16, "proxy" replaces "middleware" and runs on Node.js runtime
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isLoginPage = pathname === "/admin-login";
  const isAdminArea = pathname.startsWith("/admin") && !isLoginPage;

  if (!isAdminArea && !isLoginPage) return;

  const session = await auth();

  // Protect all /admin/* routes — redirect to login if not authenticated
  if (isAdminArea && !session) {
    return NextResponse.redirect(new URL("/admin-login", req.url));
  }

  // Already logged in — don't show login page again
  if (isLoginPage && session) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }
}

export const config = {
  matcher: ["/admin/:path*", "/admin-login"],
};
