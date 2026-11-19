import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { pagePath } from "@/lib/pages";
import { getSiteLock } from "@/lib/siteLock.server";
import { isLockActive } from "@/lib/siteLock";

// A sitemap is a Route Handler that Next caches at build time by default, which
// would freeze the catalogue into it and leave the gate below never re-checked.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://swebo.co.il";

  // The sitemap is not matched by the proxy — a rewrite would hand crawlers an
  // HTML page in place of XML — so the closed store has to be honoured here.
  // Otherwise every product URL stays listed, and indexed, while the shop is
  // dark: exactly what the holding page's noindex is trying to prevent.
  if (isLockActive(await getSiteLock())) return [];

  const [products, pages] = await Promise.all([
    prisma.product.findMany({ where: { active: true }, select: { id: true, updatedAt: true } }),
    prisma.page.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
  ]);

  return [
    { url: base, lastModified: new Date() },
    { url: `${base}/privacy`, lastModified: new Date() },
    { url: `${base}/terms`, lastModified: new Date() },
    ...pages.map((p) => ({ url: `${base}${pagePath(p.slug)}`, lastModified: p.updatedAt })),
    ...products.map((p) => ({
      url: `${base}/product/${p.id}`,
      lastModified: p.updatedAt,
    })),
  ];
}
