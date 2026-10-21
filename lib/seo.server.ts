import { prisma } from "@/lib/db";
import { SEO_KEYS, SEO_DEFAULTS, parseSeo, type Seo } from "@/lib/seo";

// Kept apart from lib/seo.ts so the admin screen can share the defaults without
// pulling Prisma into the browser bundle.
export async function getSeo(): Promise<Seo> {
  try {
    const rows = await prisma.siteConfig.findMany({ where: { key: { in: Object.values(SEO_KEYS) } } });
    const config: Record<string, string> = {};
    rows.forEach((r) => { config[r.key] = r.value; });
    return parseSeo(config);
  } catch (e) {
    // Every page's <head> goes through here; a database blip must not fail them.
    console.error("[seo] could not read the SEO settings, using the defaults:", e);
    return SEO_DEFAULTS;
  }
}
