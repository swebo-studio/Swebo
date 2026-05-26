"use client";
import { useState } from "react";
import Image from "next/image";
import { useCart } from "./CartProvider";
import { useRouter } from "next/navigation";

const SIZES = ["S", "M", "L", "XL"];

interface ProductColor {
  id: string;
  nameHe: string;
  hex: string;
  stock: number;
  imageUrl?: string | null;
}

interface ProductImage {
  id: string;
  url: string;
}

interface Props {
  product: {
    id: string;
    nameHe: string;
    price: number;
    image: string;
    stock: number;
    images: ProductImage[];
    colors: ProductColor[];
  };
}

export default function ProductDetail({ product }: Props) {
  const { addItem } = useCart();
  const router = useRouter();

  const baseImages = product.images.length > 0
    ? product.images.map((i) => i.url)
    : product.image ? [product.image] : [];

  const hasColors = product.colors.length > 0;

  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(
    hasColors && product.colors.length === 1 ? product.colors[0] : null
  );
  const [mainImg, setMainImg] = useState(
    (hasColors && product.colors.length === 1 && product.colors[0].imageUrl)
      ? product.colors[0].imageUrl
      : baseImages[0] ?? ""
  );
  const [selectedSize, setSelectedSize] = useState("");
  const [added, setAdded] = useState(false);

  function handleColorSelect(color: ProductColor) {
    setSelectedColor(color);
    setMainImg(color.imageUrl || baseImages[0] || "");
  }

  const effectiveStock = hasColors ? (selectedColor?.stock ?? 0) : product.stock;
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
      image: mainImg || product.image,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="grid md:grid-cols-2 gap-10 items-start">
      {/* Gallery */}
      <div className="flex flex-col gap-3">
        <div
          className="rounded-2xl overflow-hidden border aspect-square relative"
          style={{ borderColor: "var(--border)", background: "var(--cream-dark)" }}
        >
          {mainImg ? (
            <Image src={mainImg} alt={product.nameHe} fill className="object-cover" priority />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-8xl">👕</div>
          )}
        </div>

        {/* Thumbnails: gallery images + color images combined */}
        {(() => {
          const thumbs: { url: string; label?: string }[] = [];
          baseImages.forEach((url) => thumbs.push({ url }));
          // Add color images that aren't already in baseImages
          if (hasColors) {
            product.colors.forEach((c) => {
              if (c.imageUrl && !baseImages.includes(c.imageUrl)) {
                thumbs.push({ url: c.imageUrl, label: c.nameHe });
              }
            });
          }
          return thumbs.length > 1 ? (
            <div className="flex gap-2 flex-wrap justify-center">
              {thumbs.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setMainImg(t.url)}
                  className="relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all"
                  style={{ borderColor: mainImg === t.url ? "var(--text)" : "var(--border)" }}
                  title={t.label}
                >
                  <Image src={t.url} alt={t.label ?? `תמונה ${i + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          ) : null;
        })()}
      </div>

      {/* Info panel */}
      <div className="flex flex-col gap-5 text-right">
        {/* Color picker */}
        {hasColors && (
          <div>
            <p className="text-sm font-medium mb-3" style={{ color: "var(--text-muted)" }}>
              {selectedColor ? `צבע: ${selectedColor.nameHe}` : "בחר צבע:"}
            </p>
            <div className="flex gap-3 justify-end flex-wrap">
              {product.colors.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleColorSelect(c)}
                  disabled={c.stock === 0}
                  title={c.nameHe}
                  className="flex flex-col items-center gap-1.5 transition-opacity disabled:opacity-35"
                >
                  <span
                    className="w-10 h-10 rounded-full block border-2 transition-all"
                    style={{
                      background: c.hex,
                      borderColor: "transparent",
                      outline: selectedColor?.id === c.id ? `3px solid var(--text)` : "3px solid transparent",
                      outlineOffset: "2px",
                      transform: selectedColor?.id === c.id ? "scale(1.15)" : "scale(1)",
                    }}
                  />
                  <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                    {c.nameHe}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stock */}
        <div
          className="text-sm px-3 py-1.5 rounded-full self-end"
          style={{
            background: effectiveStock > 0 ? "#e8f5e9" : "#f5e8e8",
            color: effectiveStock > 0 ? "var(--green)" : "var(--maroon)",
          }}
        >
          {effectiveStock > 0 ? `${effectiveStock} יחידות במלאי` : "אזל מהמלאי"}
        </div>

        {/* Size picker */}
        {effectiveStock > 0 && (
          <div>
            <p className="text-sm font-medium mb-2" style={{ color: "var(--text-muted)" }}>
              בחר מידה:
            </p>
            <div className="flex gap-2 justify-end flex-wrap">
              {SIZES.map((s) => (
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
        )}

        {/* Add to cart buttons */}
        {effectiveStock > 0 && (
          <>
            <button
              onClick={handleAdd}
              disabled={!canAdd}
              className="w-full py-4 rounded-2xl font-bold text-lg transition-all disabled:opacity-40"
              style={{ background: added ? "var(--green)" : "var(--text)", color: "var(--cream)" }}
            >
              {added ? "✓ נוסף לסל!" : "הוסף לסל"}
            </button>

            <button
              onClick={() => { if (!canAdd) return; handleAdd(); router.push("/cart"); }}
              disabled={!canAdd}
              className="w-full py-3 rounded-2xl font-bold text-base border-2 transition-all disabled:opacity-40"
              style={{ borderColor: "var(--text)", color: "var(--text)", background: "transparent" }}
            >
              קנה עכשיו
            </button>
          </>
        )}

        {/* Shipping info */}
        <div
          className="mt-2 p-4 rounded-xl text-sm border"
          style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
        >
          <div className="flex justify-between mb-2">
            <span>🚚 משלוח</span><span>₪40</span>
          </div>
          <div className="flex justify-between">
            <span>💳 תשלום</span><span>GROW – מאובטח</span>
          </div>
        </div>
      </div>
    </div>
  );
}
