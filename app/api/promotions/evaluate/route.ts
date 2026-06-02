import { NextRequest } from "next/server";
import { evaluatePromotions } from "@/lib/promotions";

export async function POST(req: NextRequest) {
  const { cartItems, subtotal } = await req.json();
  const rewards = await evaluatePromotions(cartItems, subtotal);
  return Response.json(rewards);
}
