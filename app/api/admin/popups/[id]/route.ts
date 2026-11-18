import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { popupInput } from "@/lib/popups";

type Ctx = { params: Promise<{ id: string }> };

/** Full edit. `showAgain: true` also shows it again to visitors who acknowledged it. */
export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const input = popupInput(body);
  if (!input.ok) return Response.json({ error: input.error }, { status: 400 });
  try {
    const popup = await prisma.sitePopup.update({
      where: { id },
      data: { ...input.data, ...(body.showAgain === true && { version: { increment: 1 } }) },
    });
    return Response.json(popup);
  } catch {
    return Response.json({ error: "ההודעה לא נמצאה" }, { status: 404 });
  }
}

/** Switch on or off. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { active } = await req.json();
  if (typeof active !== "boolean") return Response.json({ error: "Invalid" }, { status: 400 });
  try {
    const popup = await prisma.sitePopup.update({ where: { id }, data: { active } });
    return Response.json(popup);
  } catch {
    return Response.json({ error: "ההודעה לא נמצאה" }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.sitePopup.deleteMany({ where: { id } });
  return Response.json({ ok: true });
}
