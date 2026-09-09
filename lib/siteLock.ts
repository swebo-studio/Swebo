/**
 * "Closed site" mode: the storefront is replaced by a holding page with an
 * image, two taglines and a countdown to the reopening time. Stored in
 * SiteConfig so it needs no migration and can be flipped from /admin/lock.
 */
export const SITE_LOCK_KEYS = [
  "siteLock.enabled",
  "siteLock.imagePath",
  "siteLock.tagline1",
  "siteLock.tagline2",
  "siteLock.reopenAt",
  "siteLock.autoReopen",
] as const;

export interface SiteLock {
  enabled: boolean;
  imagePath: string;
  tagline1: string;
  tagline2: string;
  /** ISO timestamp the countdown targets, or "" for no countdown. */
  reopenAt: string;
  /** When true, the store unlocks itself once reopenAt passes. */
  autoReopen: boolean;
}

export const EMPTY_SITE_LOCK: SiteLock = {
  enabled: false,
  imagePath: "",
  tagline1: "",
  tagline2: "",
  reopenAt: "",
  autoReopen: false,
};

export function parseSiteLock(config: Record<string, string | undefined>): SiteLock {
  const reopenAt = config["siteLock.reopenAt"]?.trim() ?? "";
  return {
    enabled: config["siteLock.enabled"] === "true",
    imagePath: config["siteLock.imagePath"]?.trim() ?? "",
    tagline1: config["siteLock.tagline1"] ?? "",
    tagline2: config["siteLock.tagline2"] ?? "",
    // Guard against a half-typed or cleared date reaching the storefront as
    // an "Invalid Date" countdown.
    reopenAt: reopenAt && !Number.isNaN(Date.parse(reopenAt)) ? reopenAt : "",
    autoReopen: config["siteLock.autoReopen"] === "true",
  };
}

/**
 * Whether visitors should be seeing the holding page right now. Auto-reopen
 * makes the switch happen without anyone touching the admin, so the countdown
 * hitting zero is not a promise the site then breaks.
 */
export function isLockActive(lock: SiteLock, now: Date = new Date()): boolean {
  if (!lock.enabled) return false;
  if (lock.autoReopen && lock.reopenAt && Date.parse(lock.reopenAt) <= now.getTime()) return false;
  return true;
}
