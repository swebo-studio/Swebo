import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { releasePreorder, type ReleaseResult } from "@/lib/fulfillOrder";

export const maxDuration = 300;

const MAX_IDS = 200;

/**
 * Admin: release preorders — one, or every order ticked in the preorders
 * column. Each opens its HFD shipment, moves to "received" and texts the
 * buyer; one failing does not stop the rest. A few at a time, so a big
 * release does not flood HFD.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const ids: unknown = body?.ids;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_IDS || !ids.every((id) => typeof id === "string")) {
    return Response.json({ error: `יש לבחור בין 1 ל-${MAX_IDS} הזמנות` }, { status: 400 });
  }

  const unique = [...new Set(ids as string[])];
  const results: Record<string, ReleaseResult> = {};
  const BATCH = 5;
  for (let i = 0; i < unique.length; i += BATCH) {
    await Promise.all(unique.slice(i, i + BATCH).map(async (id) => {
      try {
        results[id] = await releasePreorder(id);
      } catch (e) {
        console.error("[Preorder release] failed:", id, e);
        results[id] = { ok: false, error: "שגיאה בשחרור ההזמנה" };
      }
    }));
  }
  return Response.json({ results });
}
