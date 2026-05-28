"use client";
import { useCart } from "@/components/CartProvider";
import Header from "@/components/Header";
import Image from "next/image";
import Link from "next/link";

export default function CartPage() {
  const { items, removeItem, updateQty, totalPrice, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <>
        <Header />
        <main className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="text-7xl mb-6"></div>
          <h1 className="text-2xl font-bold mb-4" style={{ color: "var(--text)" }}>
            העגלה שלך ריקה
          </h1>
          <Link
            href="/"
            className="inline-block px-8 py-3 rounded-2xl font-bold text-base transition-opacity hover:opacity-80"
            style={{ background: "var(--text)", color: "var(--cream)" }}
          >
            המשך קנייה
          </Link>
        </main>
      </>
    );
  }

  const delivery = 40;
  const total = totalPrice + delivery;

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-extrabold mb-8 text-right" style={{ color: "var(--text)" }}>
          עגלת הקניות
        </h1>

        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <div
              key={`${item.productId}-${item.size}-${item.color ?? ""}`}
              className="flex items-center gap-4 p-4 rounded-2xl border"
              style={{ background: "var(--cream-dark)", borderColor: "var(--border)" }}
            >
              {/* Image */}
              <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-white">
                {item.image ? (
                  <Image src={item.image} alt={item.nameHe} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--cream-dark)" }} />
                )}
              </div>

              {/* Details */}
              <div className="flex-1 text-right">
                <p className="font-bold" style={{ color: "var(--text)" }}>
                  {item.nameHe}
                </p>
                <div className="flex items-center justify-end gap-2 mt-0.5">
                  {item.colorHex && (
                    <span
                      className="w-4 h-4 rounded-full inline-block border"
                      style={{ background: item.colorHex, borderColor: "var(--border)" }}
                    />
                  )}
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    {item.color ? `${item.color} · ` : ""}מידה: {item.size}
                  </p>
                </div>
                <p className="font-extrabold mt-1" style={{ color: "var(--text)" }}>
                  ₪{item.price * item.quantity}
                </p>
              </div>

              {/* Qty */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQty(item.productId, item.size, item.quantity + 1, item.color)}
                  className="w-8 h-8 rounded-full border font-bold transition-colors hover:bg-gray-100"
                  style={{ borderColor: "var(--border)" }}
                >
                  +
                </button>
                <span className="w-6 text-center font-bold">{item.quantity}</span>
                <button
                  onClick={() => updateQty(item.productId, item.size, item.quantity - 1, item.color)}
                  className="w-8 h-8 rounded-full border font-bold transition-colors hover:bg-gray-100"
                  style={{ borderColor: "var(--border)" }}
                >
                  −
                </button>
              </div>

              {/* Remove */}
              <button
                onClick={() => removeItem(item.productId, item.size, item.color)}
                className="text-xl opacity-40 hover:opacity-100 transition-opacity"
                aria-label="הסר"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div
          className="mt-8 p-6 rounded-2xl border"
          style={{ background: "var(--cream-dark)", borderColor: "var(--border)" }}
        >
          <div className="flex justify-between mb-2 text-right" style={{ color: "var(--text-muted)" }}>
            <span>₪{totalPrice}</span>
            <span>סכום ביניים</span>
          </div>
          <div className="flex justify-between mb-4 text-right" style={{ color: "var(--text-muted)" }}>
            <span>₪{delivery}</span>
            <span>משלוח</span>
          </div>
          <div
            className="flex justify-between pt-4 border-t font-extrabold text-xl"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            <span>₪{total}</span>
            <span>סה&quot;כ</span>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/checkout"
            className="w-full py-4 rounded-2xl font-bold text-lg text-center block transition-opacity hover:opacity-80"
            style={{ background: "var(--text)", color: "var(--cream)" }}
          >
            המשך לתשלום
          </Link>
          <button
            onClick={clearCart}
            className="w-full py-3 rounded-2xl text-sm border transition-opacity hover:opacity-70"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
          >
            רוקן עגלה
          </button>
        </div>
      </main>
    </>
  );
}
