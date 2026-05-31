import { prisma } from "@/lib/db";

const PUBLIC_KEYS = ["announcement.items", "hero.slogan", "hero.catalogName", "hero.imagePath", "hero.videoPath", "contact.whatsapp", "contact.instagram", "contact.tiktok", "contact.email", "sizeChart"];

export async function GET() {
  const rows = await prisma.siteConfig.findMany({ where: { key: { in: PUBLIC_KEYS } } });
  const config: Record<string, string> = {};
  rows.forEach((r) => { config[r.key] = r.value; });
  return Response.json(config);
}
