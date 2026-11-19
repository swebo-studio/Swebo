import { notFound } from "next/navigation";
import Header from "@/components/Header";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

// A Hebrew slug may reach us still percent-encoded
function readSlug(raw: string): string {
  try { return raw.includes("%") ? decodeURIComponent(raw) : raw; } catch { return raw; }
}

async function findPage(raw: string) {
  return prisma.page.findFirst({ where: { slug: readSlug(raw), published: true } });
}

export async function generateMetadata({ params }: Props) {
  const page = await findPage((await params).slug);
  return { title: page?.title ?? "העמוד לא נמצא" };
}

export default async function InfoPage({ params }: Props) {
  const page = await findPage((await params).slug);
  if (!page) notFound();

  return (
    <>
      <Header />
      <main id="main-content" className="max-w-2xl mx-auto px-4 py-12 text-right" style={{ color: "var(--text)" }}>
        <h1 className="text-3xl font-extrabold mb-8">{page.title}</h1>
        <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-muted)" }}>
          {page.content}
        </p>
      </main>
    </>
  );
}
