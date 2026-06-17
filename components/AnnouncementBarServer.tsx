import { prisma } from "@/lib/db";
import AnnouncementBar from "./AnnouncementBar";

export default async function AnnouncementBarServer() {
  const row = await prisma.siteConfig.findUnique({ where: { key: "announcement.items" } }).catch(() => null);
  const raw = row?.value ?? "";
  const items = raw.split("\n").map((s) => s.trim()).filter(Boolean).map((s) => {
    const pipe = s.indexOf("|");
    if (pipe === -1) return { text: s };
    return { text: s.slice(0, pipe).trim(), url: s.slice(pipe + 1).trim() };
  });
  return <AnnouncementBar items={items} />;
}
