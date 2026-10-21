"use client";
import Image from "next/image";
import Link from "next/link";
import { ProductBadges } from "@/components/ProductBadge";
import type { CardBadge } from "@/lib/promotionBadges";

interface Props {
  id: string;
  nameHe: string;
  price: number;
  image: string;
  stock: number;
  discountedPrice?: number;
  /** promotion tags, each in the corner its promotion chose */
  badges?: CardBadge[];
}

export default function ProductCard({ id, nameHe, price, image, stock, discountedPrice, badges = [] }: Props) {
  const lowStock: CardBadge[] = stock > 0 && stock <= 3
    ? [{ text: "אחרונים במלאי", color: "var(--warn)", size: "sm", position: "top-right" }]
    : [];
  return (
    <Link href={`/product/${id}`} className="group block h-full">
      <div
        className="h-full flex flex-col rounded-2xl overflow-hidden border transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-1"
        style={{ borderColor: "var(--border)", background: "var(--cream-dark)" }}
      >
        <div className="relative w-full aspect-square bg-white">
          {image ? (
            <Image
              src={image}
              alt={nameHe}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full" style={{ background: "var(--cream-dark)" }} />
          )}
          {stock === 0 && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-white font-bold text-lg bg-black/75 px-4 py-2 rounded-lg">
                אזל מהמלאי
              </span>
            </div>
          )}
          {stock > 0 && <ProductBadges badges={[...lowStock, ...badges]} />}
        </div>
        <div className="p-4 flex-1 flex flex-col">
          <h3 dir="auto" title={nameHe} className="font-bold text-base md:text-lg leading-6 md:leading-7 mb-1 text-start line-clamp-2 h-12 md:h-14" style={{ color: "var(--text)" }}>
            {nameHe}
          </h3>
          <div className="mt-auto flex items-center gap-2 justify-end">
            {discountedPrice !== undefined && discountedPrice < price ? (
              <>
                <span className="text-sm line-through" style={{ color: "var(--text-muted)" }}>
                  <span className="sr-only">מחיר מקורי: </span>₪{price}
                </span>
                <span className="font-extrabold text-xl" style={{ color: "var(--maroon)" }}>
                  <span className="sr-only">מחיר מבצע: </span>₪{discountedPrice}
                </span>
              </>
            ) : (
              <span className="font-extrabold text-xl" style={{ color: "var(--text)" }}>
                <span className="sr-only">מחיר: </span>₪{price}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
