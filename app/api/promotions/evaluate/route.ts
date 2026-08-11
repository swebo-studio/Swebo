import { NextRequest } from "next/server";
import { evaluateCartPromotions } from "@/lib/promotions";

export async function POST(req: NextRequest) {
  const { cartItems, subtotal } = await req.json();
  const evaluation = await evaluateCartPromotions(cartItems, subtotal);
  return Response.json(evaluation);
}
