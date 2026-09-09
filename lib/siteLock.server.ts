import { prisma } from "@/lib/db";
import { SITE_LOCK_KEYS, parseSiteLock, EMPTY_SITE_LOCK, type SiteLock } from "@/lib/siteLock";

// Kept apart from lib/siteLock.ts so the admin screen and other client
// components can share the parsing helpers without pulling Prisma into the
// browser bundle.

// The gate runs in proxy.ts, i.e. on every request. A few seconds of staleness
// is a fair trade for not querying the database on each one; flipping the
// switch in the admin takes effect within this window.
const CACHE_MS = 5_000;
let cached: { lock: SiteLock; at: number } | null = null;

export async function getSiteLock(): Promise<SiteLock> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.lock;
  try {
    const rows = await prisma.siteConfig.findMany({ where: { key: { in: [...SITE_LOCK_KEYS] } } });
    const config: Record<string, string> = {};
    rows.forEach((r) => { config[r.key] = r.value; });
    const lock = parseSiteLock(config);
    cached = { lock, at: Date.now() };
    return lock;
  } catch {
    // A database blip must not take the storefront down: fail open.
    return cached?.lock ?? EMPTY_SITE_LOCK;
  }
}
