import Image from "next/image";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import ClosedCountdown from "@/components/ClosedCountdown";
import { SITE_LOCK_KEYS, parseSiteLock, isLockActive } from "@/lib/siteLock";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "האתר סגור זמנית",
  robots: { index: false, follow: false },
};

export default async function ClosedPage() {
  const rows = await prisma.siteConfig.findMany({ where: { key: { in: [...SITE_LOCK_KEYS] } } });
  const config: Record<string, string> = {};
  rows.forEach((r) => { config[r.key] = r.value; });
  const lock = parseSiteLock(config);

  // Reachable directly as /closed; if the store is open there is nothing to show.
  if (!isLockActive(lock)) redirect("/");

  return (
    <main
      id="main-content"
      // Read by NewsletterPopup, which lives in the root layout and so renders
      // here too. The proxy reaches this page by rewrite, so the URL cannot tell
      // it apart from the storefront.
      data-site-closed=""
      className="min-h-screen flex flex-col items-center justify-center text-center px-6 py-16"
      style={{ background: "var(--cream)" }}
    >
      <div className="w-full max-w-lg flex flex-col items-center">
        {/* The image is capped in both directions so a tall "closed" sign
            cannot push the taglines and the countdown below the fold. */}
        {lock.imagePath ? (
          <Image
            src={lock.imagePath}
            alt=""
            width={520}
            height={520}
            priority
            className="w-auto h-auto max-w-[260px] sm:max-w-xs max-h-[38vh] object-contain mb-8"
          />
        ) : (
          <Image src="/logo.png" alt="SWEBO" width={140} height={70} priority className="object-contain mb-10" />
        )}

        {lock.tagline1 && (
          <h1 className="text-2xl sm:text-4xl font-extrabold leading-tight" style={{ color: "var(--text)" }}>
            {lock.tagline1}
          </h1>
        )}
        {lock.tagline2 && (
          <p className="mt-4 text-base sm:text-lg" style={{ color: "var(--text-muted)" }}>
            {lock.tagline2}
          </p>
        )}

        {lock.reopenAt && <ClosedCountdown reopenAt={lock.reopenAt} />}
      </div>
    </main>
  );
}
