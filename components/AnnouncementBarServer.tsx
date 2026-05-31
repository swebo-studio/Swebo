import { prisma } from "@/lib/db";
import AnnouncementBar from "./AnnouncementBar";

export default async function AnnouncementBarServer() {
  const row = await prisma.siteConfig.findUnique({ where: { key: "announcement.items" } }).catch(() => null);
  const raw = row?.value ?? "";
  const items = raw.split("\n").map((s) => s.trim()).filter(Boolean);
  return <AnnouncementBar items={items} />;
}
