"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useCart } from "./CartProvider";
import { useRouter, useSearchParams } from "next/navigation";
import SizeChartModal from "./SizeChartModal";

const SIZES = ["S", "M", "L", "XL"];

interface ColorImage { id: string; url: string }
interface SizeStock { size: string; stock: number }

interface ProductColor {
  id: string;
  nameHe: string;
  hex: string;
  stock: number;
  images: ColorImage[];
  linkedUrl?: string | null;
}

interface SizeRow { size: string; chest: number; waist: number; length: number }

interface Props {
  product: {
    id: string;
    nameHe: string;
    price: number;
    image: string;
    stock: number;
    colors: ProductColor[];
  };
  sizeChart: SizeRow[];
}

export default function ProductDetail({ product, sizeChart }: Props) {
  const { addItem } = useCart();
  const router = useRouter();
  const searchParams = useSearchParams();
  const waNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";

  const hasColors = product.colors.length > 0;

  // Init selected color from URL param
  const initialColorId = searchParams.get("color");
  const initialColor = hasColors
    ? (product.colors.find((c) => c.id === initialColorId) ?? product.colors[0])
    : null;

  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(initialColor);
  const [mainImg, setMainImg] = useState(initialColor?.images[0]?.url || product.image || "");
  const [selectedSize, setSelectedSize] = useState("");
  const [sizeStocks, setSizeStocks] = useState<SizeStock[]>([]);
  const [added, setAdded] = useState(false);

  // Load size stocks when color changes
  useEffect(() => {
    if (!selectedColor) return;
    fetch(`/api/products/${product.id}/colors/${selectedColor.id}/sizes`)
      .then((r) => r.json())
      .then(setSizeStocks)
      .catch(() => {});
  }, [selectedColor, product.id]);

  const activeImages: string[] = selectedColor
    ? selectedColor.images.map((i) => i.url)
    : product.image ? [product.image] : [];

  function handleColorSelect(color: ProductColor) {
    setSelectedColor(color);
    setSelectedSize("");
    if (color.images[0]) setMainImg(color.images[0].url);
    // Update URL without navigation
    const url = new URL(window.location.href);
    url.searchParams.set("color", color.id);
    window.history.replaceState(null, "", url.toString());
  }

  // Effective stock: per-size if sizes exist, else color total, else product stock
  const hasSizeStock = sizeStocks.some((s) => s.stock > 0);
  function sizeStock(size: string): number {
    if (sizeStocks.length > 0) return sizeStocks.find((s) => s.size === size)?.stock ?? 0;
    return selectedColor ? selectedColor.stock : product.stock;
  }
  const effectiveStock = selectedSize
    ? sizeStock(selectedSize)
    : (selectedColor ? selectedColor.stock : product.stock);

  const canAdd = selectedSize && effectiveStock > 0 && (!hasColors || selectedColor !== null);

  // WhatsApp reserve message for out-of-stock
  const reserveMsg = encodeURIComponent(
    `היי, אני רוצה להזמין: ${product.nameHe}${selectedColor ? ` – ${selectedColor.nameHe}` : ""}${selectedSize ? ` / מידה ${selectedSize}` : ""}`
  );
  const reserveHref = `https://wa.me/${waNumber}?text=${reserveMsg}`;

  function handleAdd() {
    if (!canAdd || !selectedColor) return;
    addItem({
      productId: product.id,
      nameHe: product.nameHe,
      price: product.price,
      size: selectedSize,
      color: selectedColor.nameHe,
      colorHex: selectedColor.hex,
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
            <Image src={mainImg} alt={product.nameHe} fill className="object-cover" priority sizes="(max-width:768px) 100vw, 50vw" />
          ) : (
            <div className="w-full h-full" style={{ background: "var(--cream-dark)" }} />
          )}
        </div>

        {activeImages.length > 1 && (
          <div className="flex gap-2 flex-wrap justify-center">
            {activeImages.map((url, i) => (
              <button
                key={i}
                onClick={() => setMainImg(url)}
                className="relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all"
                style={{ borderColor: mainImg === url ? "var(--text)" : "var(--border)" }}
              >
                <Image src={url} alt={`תמונה ${i + 1}`} fill className="object-cover" sizes="64px" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info panel */}
      <div className="flex flex-col gap-5 text-right">
        {/* Color picker */}
        {hasColors && (
          <div>
            <p className="text-sm font-medium mb-3" style={{ color: "var(--text-muted)" }}>
              {selectedColor ? `צבע: ${selectedColor.nameHe}` : "בחר צבע:"}
            </p>
            {selectedColor?.linkedUrl && (
              <a
                href={selectedColor.linkedUrl}
                className="text-xs underline text-right block mb-2 hover:opacity-70 transition-opacity"
                style={{ color: "var(--text-muted)" }}
              >
                ← צפה במוצר קשור
              </a>
            )}
            <div className="flex gap-3 justify-end flex-wrap">
              {product.colors.map((c) => {
                const thumb = c.images?.[0]?.url;
                return (
                  <button
                    key={c.id}
                    onClick={() => handleColorSelect(c)}
                    disabled={c.stock === 0}
                    title={c.nameHe}
                    className="flex flex-col items-center gap-1.5 transition-opacity disabled:opacity-35"
                  >
                    {thumb ? (
                      <span
                        className="w-12 h-12 rounded-xl overflow-hidden block border-2 transition-all relative"
                        style={{
                          borderColor: selectedColor?.id === c.id ? "var(--text)" : "var(--border)",
                          transform: selectedColor?.id === c.id ? "scale(1.1)" : "scale(1)",
                        }}
                      >
                        <Image src={thumb} alt={c.nameHe} fill className="object-cover" sizes="48px" />
                      </span>
                    ) : (
                      <span
                        className="w-10 h-10 rounded-full block border-2 transition-all"
                        style={{
                          background: c.hex,
                          borderColor: "transparent",
                          outline: selectedColor?.id === c.id ? "3px solid var(--text)" : "3px solid transparent",
                          outlineOffset: "2px",
                          transform: selectedColor?.id === c.id ? "scale(1.15)" : "scale(1)",
                        }}
                      />
                    )}
                    <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{c.nameHe}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Stock badge */}
        {effectiveStock === 0 && (
          <div className="text-sm px-3 py-1.5 rounded-full self-end" style={{ background: "#f5e8e8", color: "var(--maroon)" }}>
            אזל מהמלאי
          </div>
        )}
        {effectiveStock > 0 && effectiveStock <= 3 && (
          <div className="text-sm px-3 py-1.5 rounded-full self-end bg-orange-400 text-white font-bold">
            אחרונים במלאי
          </div>
        )}

        {/* Size picker with per-size stock */}
        {selectedColor && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <SizeChartModal rows={sizeChart} />
              <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>בחר מידה:</p>
            </div>
            <div className="flex gap-2 justify-end flex-wrap">
              {SIZES.map((s) => {
                const stock = sizeStock(s);
                const outOfStock = sizeStocks.length > 0 && stock === 0;
                return (
                  <button
                    key={s}
                    onClick={() => !outOfStock && setSelectedSize(s)}
                    disabled={outOfStock}
                    className="relative w-14 h-14 rounded-xl border-2 font-bold text-sm transition-all disabled:opacity-35"
                    style={{
                      borderColor: selectedSize === s ? "var(--text)" : "var(--border)",
                      background: selectedSize === s ? "var(--text)" : "transparent",
                      color: selectedSize === s ? "var(--cream)" : "var(--text)",
                    }}
                  >
                    {s}
                    {sizeStocks.length > 0 && stock <= 3 && stock > 0 && (
                      <span className="absolute -top-1.5 -left-1.5 text-[9px] bg-orange-400 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">!</span>
                    )}
                  </button>
                );
              })}
            </div>
            {sizeStocks.length > 0 && sizeStocks.some((s) => s.stock === 0) && (
              <p className="text-xs text-right mt-1" style={{ color: "var(--text-muted)" }}>
                * מידות חסרות במלאי —{" "}
                <a
                  href={`https://wa.me/972522770059?text=${encodeURIComponent("היי SWEBO, אני מעוניין להזמין מידה שאינה במלאי")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:opacity-70"
                >
                  פנו בוואטסאפ להזמנה
                </a>
              </p>
            )}
          </div>
        )}

        {/* CTA buttons */}
        {effectiveStock > 0 ? (
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
        ) : (
          /* Out of stock — WhatsApp reserve */
          <a
            href={reserveHref}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 rounded-2xl font-bold text-lg text-center flex items-center justify-center gap-3 transition-opacity hover:opacity-80"
            style={{ background: "#25D366", color: "white" }}
          >
            <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            שלח הודעה לשמירת מקום
          </a>
        )}

        {/* Shipping info */}
        <div className="mt-2 p-4 rounded-xl text-sm border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
          <div className="flex justify-between mb-2"><span>משלוח</span><span>₪40</span></div>
          <div className="flex justify-between"><span>תשלום</span><span>GROW – מאובטח</span></div>
        </div>
      </div>
    </div>
  );
}
