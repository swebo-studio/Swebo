"use client";
import { useEffect } from "react";
import { useCart } from "@/components/CartProvider";

export default function CartClearer() {
  const { clearCart } = useCart();
  useEffect(() => { clearCart(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
