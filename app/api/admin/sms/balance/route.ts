import { auth } from "@/lib/auth";
import { getSmsBalance, estimateOrderSmsCredits } from "@/lib/notify";

/** SMS credits left in ActiveTrail, and what an average order spends. */
export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [balance, estimate] = await Promise.all([
    getSmsBalance(),
    estimateOrderSmsCredits().catch((e) => {
      console.error("[SMS balance] order estimate failed:", e);
      return null;
    }),
  ]);
  return Response.json({ balance, estimate });
}
