import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://swebo.co.il";

  const products = await prisma.product.findMany({
    where: { active: true },
    select: { id: true, updatedAt: true },
  });

  return [
    { url: base, lastModified: new Date() },
    { url: `${base}/privacy`, lastModified: new Date() },
    { url: `${base}/terms`, lastModified: new Date() },
    ...products.map((p) => ({
      url: `${base}/product/${p.id}`,
      lastModified: p.updatedAt,
    })),
  ];
}
