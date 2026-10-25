import { auth } from "@/lib/auth";
import { getSiteLock } from "@/lib/siteLock.server";
import { isLockActive, type SiteLock } from "@/lib/siteLock";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Paths that must keep working while the store is closed to the public:
// the admin and its login, the auth/admin APIs behind it, the payment
// callback for orders placed before the lock, and the cron endpoints.
//
// /order is here because HYPay sends the paying customer's own browser to
// /api/payment/notify, which charges the card and then redirects onward to
// /order/<id>. Without the exemption someone who paid in the moments before
// the lock was flipped is charged and then shown the holding page instead of
// their confirmation. An order only renders for whoever holds its id, so
// exempting it does not reopen the storefront.
const LOCK_EXEMPT_PREFIXES = [
  "/admin",
  "/admin-login",
  "/closed",
  "/order",
  "/api/auth",
  "/api/admin",
  "/api/upload",
  "/api/payment/notify",
  "/api/cron",
  "/opengraph-image",
];

// The holding page still has to render. Its image is whatever the admin
// uploaded — a local /uploads path in development, a Blob URL in production —
// and /logo.png is what it falls back to when none is set. Everything else
// under /uploads stays blocked, so the catalogue's photography is not left
// browsable to anyone who kept an image URL while the shop is dark.
function isLockAsset(req: NextRequest, lock: SiteLock): boolean {
  const { pathname, searchParams } = req.nextUrl;
  const allowed = [lock.imagePath, "/logo.png"].filter(Boolean);
  if (allowed.includes(pathname)) return true;
  // next/image requests the original through the optimiser, so the real target
  // is in the url param rather than the path.
  if (pathname === "/_next/image") {
    const url = searchParams.get("url");
    return !!url && allowed.includes(url);
  }
  return false;
}

// In Next.js 16, "proxy" replaces "middleware" and runs on Node.js runtime
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Writes to the API only from this site's own pages. A browser always sends
  // Origin on a cross-site POST, so another site cannot ride an admin's
  // cookie into, say, recording a creator payout. (No Origin at all is a
  // script, which has no admin cookie to borrow.)
  if (pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.headers.get("origin");
    if (origin && originHost(origin) !== req.headers.get("host")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }
  const isLoginPage = pathname === "/admin-login";
  const isAdminArea = pathname.startsWith("/admin") && !isLoginPage;

  if (isAdminArea || isLoginPage) {
    const session = await auth();

    // Protect all /admin/* routes — redirect to login if not authenticated
    if (isAdminArea && !session) {
      return NextResponse.redirect(new URL("/admin-login", req.url));
    }

    // Already logged in — don't show login page again
    if (isLoginPage && session) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    return;
  }

  const lock = await getSiteLock();
  if (!isLockActive(lock)) return;
  if (LOCK_EXEMPT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return;
  if (isLockAsset(req, lock)) return;

  // Signed-in admins keep browsing the real storefront, so the store can be
  // checked over while it is closed to everyone else.
  if (await auth()) return;

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "SiteClosed", message: "האתר סגור כרגע" },
      { status: 503, headers: { "Retry-After": retryAfter(lock.reopenAt) } }
    );
  }

  // Rewrite rather than redirect so the visitor keeps the URL they came for
  // and lands back on it once the store reopens.
  const res = NextResponse.rewrite(new URL("/closed", req.url));
  res.headers.set("x-robots-tag", "noindex");
  return res;
}

/** The host an Origin header names; null for "null" (sandboxed pages) or junk. */
function originHost(origin: string): string | null {
  try { return new URL(origin).host; } catch { return null; }
}

function retryAfter(reopenAt: string): string {
  const seconds = reopenAt ? Math.ceil((Date.parse(reopenAt) - Date.now()) / 1000) : 0;
  return String(seconds > 0 ? seconds : 3600);
}

export const config = {
  matcher: [
    // Only the build output and the tab icons skip the proxy. Uploads and the
    // image optimiser deliberately go through it so the lock can gate them;
    // .txt/.xml stay out because rewriting /sitemap.xml or /robots.txt would
    // hand a crawler HTML in place of the format it asked for — those two
    // honour the lock themselves, in app/sitemap.ts and app/robots.ts.
    "/((?!_next/static|favicon\\.ico|icon\\.png|apple-icon\\.png|.*\\.(?:txt|xml)$).*)",
  ],
};
