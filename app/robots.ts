import type { MetadataRoute } from "next";
import { getSiteLock } from "@/lib/siteLock.server";
import { isLockActive } from "@/lib/siteLock";

// Cached at build time otherwise — see the note in app/sitemap.ts.
export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://swebo.co.il";

  // While the store is closed, ask crawlers to stay away entirely and stop
  // advertising the sitemap, which is empty for the duration anyway.
  if (isLockActive(await getSiteLock())) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/admin/",
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
