"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface CartItem {
  productId: string;
  nameHe: string;
  price: number;
  size: string;
  color?: string;
  colorHex?: string;
  quantity: number;
  image: string;
  maxQty?: number; // stock at time of adding — used to cap +/- in cart
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, size: string, color?: string) => void;
  updateQty: (productId: string, size: string, quantity: number, color?: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("swebo_cart");
      if (saved) setItems(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("swebo_cart", JSON.stringify(items));
  }, [items]);

  function match(i: CartItem, item: CartItem) {
    return i.productId === item.productId && i.size === item.size && (i.color ?? "") === (item.color ?? "");
  }

  function addItem(item: CartItem) {
    setItems((prev) => {
      const existing = prev.find((i) => match(i, item));
      if (existing) {
        const cap = item.maxQty ?? existing.maxQty ?? Infinity;
        const next = Math.min(existing.quantity + item.quantity, cap);
        return prev.map((i) => match(i, item) ? { ...i, quantity: next, maxQty: item.maxQty ?? i.maxQty } : i);
      }
      return [...prev, item];
    });
  }

  function removeItem(productId: string, size: string, color?: string) {
    setItems((prev) =>
      prev.filter((i) => !(i.productId === productId && i.size === size && (i.color ?? "") === (color ?? "")))
    );
  }

  function updateQty(productId: string, size: string, quantity: number, color?: string) {
    if (quantity < 1) { removeItem(productId, size, color); return; }
    setItems((prev) =>
      prev.map((i) => {
        if (!(i.productId === productId && i.size === size && (i.color ?? "") === (color ?? ""))) return i;
        const capped = i.maxQty ? Math.min(quantity, i.maxQty) : quantity;
        return { ...i, quantity: capped };
      })
    );
  }

  function clearCart() { setItems([]); }

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQty, clearCart, totalItems, totalPrice }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
