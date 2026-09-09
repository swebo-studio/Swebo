import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const categories = await prisma.category.findMany({
    // id breaks ties. Without it, two categories sharing a sortOrder come back
    // in whatever order Postgres feels like, so the drawer and the storefront
    // can disagree — and can disagree with themselves between two requests.
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: { _count: { select: { products: { where: { active: true } } } } },
  });
  return NextResponse.json(categories);
}
