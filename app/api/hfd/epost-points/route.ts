import { NextRequest } from "next/server";

const HFD_BASE = process.env.HFD_API_URL || "https://api.hfd.co.il/rest/v2";
const HFD_TOKEN = process.env.HFD_TOKEN || "";

export async function GET(req: NextRequest) {
  const city = req.nextUrl.searchParams.get("city");
  if (!city) return Response.json({ error: "נדרשת עיר" }, { status: 400 });

  try {
    const res = await fetch(
      `${HFD_BASE}/epost-points?city=${encodeURIComponent(city)}`,
      {
        headers: {
          "Content-Type": "application/json",
          ...(HFD_TOKEN ? { Authorization: `Bearer ${HFD_TOKEN}` } : {}),
        },
        cache: "no-store",
      }
    );
    if (!res.ok) return Response.json([], { status: 200 });
    const data = await res.json();
    // Filter to only points that accept deliveries
    const points = Array.isArray(data) ? data.filter((p: { mesirot_yn?: string }) => p.mesirot_yn === "y") : [];
    return Response.json(points);
  } catch {
    return Response.json([], { status: 200 });
  }
}
