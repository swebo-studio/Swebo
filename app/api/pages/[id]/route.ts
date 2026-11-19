import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { pageInput } from "@/lib/pages";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Ctx) {
  if (!(await auth())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);

  // Moving a page up or down the menu: { move: "up" | "down" }
  if (body?.move === "up" || body?.move === "down") {
    const pages = await prisma.page.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } });
    const i = pages.findIndex((p) => p.id === id);
    const j = body.move === "up" ? i - 1 : i + 1;
    if (i === -1) return Response.json({ error: "Not found" }, { status: 404 });
    if (j >= 0 && j < pages.length) [pages[i], pages[j]] = [pages[j], pages[i]];
    await prisma.$transaction(pages.map((p, n) => prisma.page.update({ where: { id: p.id }, data: { sortOrder: n } })));
    return Response.json({ ok: true });
  }

  const input = pageInput(body);
  if (!input.ok) return Response.json({ error: input.error }, { status: 400 });
  const clash = await prisma.page.findUnique({ where: { slug: input.data.slug } });
  if (clash && clash.id !== id) return Response.json({ error: "כבר יש עמוד בכתובת הזו — בחרו כתובת אחרת" }, { status: 400 });
  const page = await prisma.page.update({ where: { id }, data: input.data }).catch(() => null);
  if (!page) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(page);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  if (!(await auth())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.page.delete({ where: { id } }).catch(() => null);
  return Response.json({ ok: true });
}
