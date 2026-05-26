"use client";
import { useState } from "react";
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

export default function AddToCartButton({ product, sizes, colors = [] }: Props) {
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState<ColorOption | null>(
    colors.length === 1 ? colors[0] : null
  );
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const router = useRouter();

  const hasColors = colors.length > 0;
  const effectiveStock = hasColors
    ? (selectedColor?.stock ?? 0)
    : Infinity;

  const canAdd = selectedSize && (!hasColors || selectedColor !== null) && effectiveStock > 0;

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
  }

  return (
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
        onClick={handleAdd}
        disabled={!canAdd}
        className="w-full py-4 rounded-2xl font-bold text-lg transition-all disabled:opacity-40"
        style={{
          background: added ? "var(--green)" : "var(--text)",
          color: "var(--cream)",
        }}
      >
        {added ? "✓ נוסף לסל!" : "הוסף לסל"}
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
  );
}
