import { prisma } from "@/lib/db";
import type { PublicPopup, PopupFrequency } from "@/lib/popups";

export const dynamic = "force-dynamic";

/** The popups the storefront should show right now, oldest first. */
export async function GET() {
  const now = new Date();
  const rows = await prisma.sitePopup.findMany({
    where: {
      active: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
    },
    orderBy: { createdAt: "asc" },
  });
  const popups: PublicPopup[] = rows.map((p) => ({
    id: p.id,
    title: p.title,
    subtitle: p.subtitle,
    text: p.text,
    image: p.image,
    frequency: p.frequency as PopupFrequency,
    version: p.version,
  }));
  return Response.json(popups, { headers: { "Cache-Control": "no-store" } });
}
