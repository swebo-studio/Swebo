"use client";
import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useCart } from "./CartProvider";
import { useRouter } from "next/navigation";

interface ColorOption {
  id: string;
  nameHe: string;
  hex: string;
  stock: number;
}

interface Props {
  product: { id: string; nameHe: string; price: number; image: string };
  sizes: string[];
  colors?: ColorOption[];
}

interface FlyCard {
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  size: string;
  colorHex?: string;
  colorName?: string;
}

export default function AddToCartButton({ product, sizes, colors = [] }: Props) {
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState<ColorOption | null>(
    colors.length === 1 ? colors[0] : null
  );
  const [added, setAdded] = useState(false);
  const [flyCard, setFlyCard] = useState<FlyCard | null>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const { addItem } = useCart();
  const router = useRouter();

  const hasColors = colors.length > 0;
  const effectiveStock = hasColors ? (selectedColor?.stock ?? 0) : Infinity;
  const canAdd = selectedSize && (!hasColors || selectedColor !== null) && effectiveStock > 0;

  function launchAnimation() {
    const btnEl = addBtnRef.current;
    const cartEl = document.getElementById("cart-icon");
    if (!btnEl || !cartEl) return;

    const bRect = btnEl.getBoundingClientRect();
    const cRect = cartEl.getBoundingClientRect();
    const cardW = 88, cardH = 108;

    const startX = bRect.left + bRect.width / 2 - cardW / 2;
    const startY = bRect.top + bRect.height / 2 - cardH / 2;
    const cartCX = cRect.left + cRect.width / 2;
    const cartCY = cRect.top + cRect.height / 2;
    const dx = cartCX - (startX + cardW / 2);
    const dy = cartCY - (startY + cardH / 2);

    setFlyCard({
      startX, startY, dx, dy,
      size: selectedSize,
      colorHex: selectedColor?.hex,
      colorName: selectedColor?.nameHe,
    });

    setTimeout(() => {
      setFlyCard(null);
      cartEl.classList.add("cart-received");
      cartEl.addEventListener("animationend", () => cartEl.classList.remove("cart-received"), { once: true });
    }, 640);
  }

  function handleAdd() {
    if (!canAdd) return;
    addItem({
      productId: product.id,
      nameHe: product.nameHe,
      price: product.price,
      size: selectedSize,
      color: selectedColor?.nameHe,
      colorHex: selectedColor?.hex,
      quantity: 1,
      image: product.image,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
    launchAnimation();
  }

  return (
    <>
    <div className="flex flex-col gap-4">
      {/* Color picker */}
      {hasColors && (
        <div>
          <p className="text-sm font-medium mb-2 text-right" style={{ color: "var(--text-muted)" }}>
            בחר צבע:
          </p>
          <div className="flex gap-3 justify-end flex-wrap">
            {colors.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedColor(c)}
                disabled={c.stock === 0}
                title={c.nameHe}
                className="relative flex flex-col items-center gap-1 transition-opacity disabled:opacity-40"
              >
                <span
                  className="w-9 h-9 rounded-full border-2 block transition-transform"
                  style={{
                    background: c.hex,
                    borderColor: selectedColor?.id === c.id ? "var(--text)" : "transparent",
                    outline: selectedColor?.id === c.id ? "2px solid var(--text)" : "2px solid transparent",
                    outlineOffset: "2px",
                    transform: selectedColor?.id === c.id ? "scale(1.15)" : "scale(1)",
                  }}
                />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{c.nameHe}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Size picker */}
      <div>
        <p className="text-sm font-medium mb-2 text-right" style={{ color: "var(--text-muted)" }}>
          בחר מידה:
        </p>
        <div className="flex gap-2 justify-end flex-wrap">
          {sizes.map((s) => (
            <button
              key={s}
              onClick={() => setSelectedSize(s)}
              className="w-12 h-12 rounded-xl border-2 font-bold text-sm transition-all"
              style={{
                borderColor: selectedSize === s ? "var(--text)" : "var(--border)",
                background: selectedSize === s ? "var(--text)" : "transparent",
                color: selectedSize === s ? "var(--cream)" : "var(--text)",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <button
        ref={addBtnRef}
        onClick={handleAdd}
        disabled={!canAdd}
        className="w-full py-4 rounded-2xl font-bold text-lg transition-all disabled:opacity-40"
        style={{
          background: added ? "var(--green)" : "var(--text)",
          color: "var(--cream)",
        }}
      >
        {added ? "נוסף לסל!" : "הוסף לסל"}
      </button>

      <button
        onClick={() => {
          if (!canAdd) return;
          handleAdd();
          router.push("/cart");
        }}
        disabled={!canAdd}
        className="w-full py-3 rounded-2xl font-bold text-base border-2 transition-all disabled:opacity-40"
        style={{
          borderColor: "var(--text)",
          color: "var(--text)",
          background: "transparent",
        }}
      >
        קנה עכשיו
      </button>
    </div>

    {/* Flying card portal */}
    {flyCard && typeof window !== "undefined" && createPortal(
      <div
        className="fly-x"
        style={{
          position: "fixed",
          left: flyCard.startX,
          top: flyCard.startY,
          width: 88,
          zIndex: 9999,
          ["--fly-dx" as string]: `${flyCard.dx}px`,
        }}
      >
        <div
          className="fly-y"
          style={{ ["--fly-dy" as string]: `${flyCard.dy}px` }}
        >
          <div
            className="fly-card-inner"
            style={{
              width: 88,
              height: 108,
              borderRadius: 14,
              overflow: "hidden",
              background: "var(--cream)",
              boxShadow: "0 10px 40px rgba(0,0,0,0.28)",
              border: "1px solid var(--border)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.image}
              alt=""
              style={{ width: "100%", height: 64, objectFit: "cover", display: "block" }}
            />
            <div style={{ padding: "5px 8px", direction: "rtl" }}>
              <p style={{
                fontSize: 10, fontWeight: 700, color: "var(--text)",
                margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {product.nameHe}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                {flyCard.colorHex && (
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: flyCard.colorHex, flexShrink: 0,
                    border: "1px solid rgba(0,0,0,0.1)",
                  }} />
                )}
                <span style={{ fontSize: 9, color: "var(--text-muted)" }}>
                  {flyCard.size}{flyCard.colorName ? ` · ${flyCard.colorName}` : ""}
                </span>
              </div>
              <p style={{ fontSize: 9, fontWeight: 700, color: "var(--text)", marginTop: 1 }}>₪{product.price}</p>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  );
}
