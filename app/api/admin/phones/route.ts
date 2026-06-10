import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const phones = await prisma.adminPhone.findMany({ orderBy: { createdAt: "asc" } });
  return Response.json(phones);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { phone: rawPhone, label } = await req.json();
  const phone = String(rawPhone || "").replace(/\D/g, "").replace(/^972/, "0");
  if (!phone) return Response.json({ error: "נדרש מספר טלפון" }, { status: 400 });

  try {
    const created = await prisma.adminPhone.create({ data: { phone, label: label || null } });
    return Response.json(created);
  } catch {
    return Response.json({ error: "מספר טלפון זה כבר קיים" }, { status: 409 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return Response.json({ error: "נדרש מזהה" }, { status: 400 });

  await prisma.adminPhone.delete({ where: { id } });
  return Response.json({ ok: true });
}
