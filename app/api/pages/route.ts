import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { pageInput } from "@/lib/pages";

/** The menu's list: published pages only, unless an admin asks for ?all=1 */
export async function GET(req: NextRequest) {
  const all = req.nextUrl.searchParams.get("all") === "1" && !!(await auth());
  const pages = await prisma.page.findMany({
    where: all ? {} : { published: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: all
      ? { id: true, slug: true, title: true, content: true, published: true, sortOrder: true }
      : { slug: true, title: true },
  });
  return Response.json(pages);
}

export async function POST(req: NextRequest) {
  if (!(await auth())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const input = pageInput(await req.json().catch(() => null));
  if (!input.ok) return Response.json({ error: input.error }, { status: 400 });
  if (await prisma.page.findUnique({ where: { slug: input.data.slug } })) {
    return Response.json({ error: "כבר יש עמוד בכתובת הזו — בחרו כתובת אחרת" }, { status: 400 });
  }
  const last = await prisma.page.aggregate({ _max: { sortOrder: true } });
  const page = await prisma.page.create({ data: { ...input.data, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
  return Response.json(page, { status: 201 });
}
