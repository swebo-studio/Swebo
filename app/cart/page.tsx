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
              className="p-4 rounded-2xl border"
              style={{ background: "var(--cream-dark)", borderColor: "var(--border)" }}
            >
              {/* Top row: image + info + remove */}
              <div className="flex gap-3">
                {/* Image */}
                <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-white">
                  {item.image ? (
                    <Image src={item.image} alt={item.nameHe} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full" style={{ background: "var(--cream-dark)" }} />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 text-right min-w-0">
                  <p className="font-bold leading-snug" style={{ color: "var(--text)" }}>
                    {item.nameHe}
                  </p>
                  <div className="flex items-center justify-end gap-1.5 mt-0.5">
                    {item.colorHex && (
                      <span
                        className="w-3.5 h-3.5 rounded-full inline-block border flex-shrink-0"
                        style={{ background: item.colorHex, borderColor: "var(--border)" }}
                      />
                    )}
                    <p className="text-sm truncate" style={{ color: "var(--text-muted)" }}>
                      {item.color ? `${item.color} · ` : ""}מידה {item.size}
                    </p>
                  </div>
                  <p className="font-extrabold mt-1" style={{ color: "var(--text)" }}>
                    ₪{item.price * item.quantity}
                  </p>
                </div>

                {/* Remove */}
                <button
                  onClick={() => removeItem(item.productId, item.size, item.color)}
                  className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full opacity-40 hover:opacity-100 transition-opacity"
                  aria-label="הסר"
                  style={{ color: "var(--text)" }}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {/* Bottom row: qty controls */}
              <div className="flex items-center justify-end gap-3 mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                <button
                  onClick={() => updateQty(item.productId, item.size, item.quantity + 1, item.color)}
                  className="w-9 h-9 rounded-full border font-bold text-lg transition-colors hover:bg-gray-100 flex items-center justify-center"
                  style={{ borderColor: "var(--border)" }}
                >
                  +
                </button>
                <span className="w-6 text-center font-bold text-base">{item.quantity}</span>
                <button
                  onClick={() => updateQty(item.productId, item.size, item.quantity - 1, item.color)}
                  className="w-9 h-9 rounded-full border font-bold text-lg transition-colors hover:bg-gray-100 flex items-center justify-center"
                  style={{ borderColor: "var(--border)" }}
                >
                  −
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div
          className="mt-8 p-6 rounded-2xl border"
          style={{ background: "var(--cream-dark)", borderColor: "var(--border)" }}
        >
          <div
            className="flex justify-between font-extrabold text-xl"
            style={{ color: "var(--text)" }}
          >
            <span>₪{totalPrice}</span>
            <span>סה&quot;כ</span>
          </div>
          <p className="text-xs text-right mt-2" style={{ color: "var(--text-muted)" }}>
            עלות המשלוח תחושב בשלב התשלום
          </p>
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
