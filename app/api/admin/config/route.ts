import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const rows = await prisma.siteConfig.findMany();
  const config: Record<string, string> = {};
  rows.forEach((r) => { config[r.key] = r.value; });
  return Response.json(config);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body: Record<string, string> = await req.json();
  await Promise.all(
    Object.entries(body).map(([key, value]) =>
      prisma.siteConfig.upsert({ where: { key }, update: { value }, create: { key, value } })
    )
  );
  return Response.json({ ok: true });
}
