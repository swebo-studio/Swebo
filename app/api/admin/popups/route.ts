import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { popupInput } from "@/lib/popups";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const popups = await prisma.sitePopup.findMany({ orderBy: { createdAt: "desc" } });
  return Response.json(popups);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const input = popupInput(await req.json());
  if (!input.ok) return Response.json({ error: input.error }, { status: 400 });
  const popup = await prisma.sitePopup.create({ data: input.data });
  return Response.json(popup);
}
