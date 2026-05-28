"use client";
import Image from "next/image";
import Link from "next/link";

interface Props {
  id: string;
  nameHe: string;
  price: number;
  image: string;
  stock: number;
}

export default function ProductCard({ id, nameHe, price, image, stock }: Props) {
  return (
    <Link href={`/product/${id}`} className="group block">
      <div
        className="rounded-2xl overflow-hidden border transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-1"
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
            <div
              className="w-full h-full"
              style={{ background: "var(--cream-dark)" }}
            />
          )}
          {stock === 0 && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-white font-bold text-lg bg-black/60 px-4 py-2 rounded-lg">
                אזל מהמלאי
              </span>
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-bold text-lg mb-1 text-right" style={{ color: "var(--text)" }}>
            {nameHe}
          </h3>
          <div className="flex items-center justify-between">
            <span
              className="text-sm font-medium px-2 py-1 rounded-full"
              style={{
                background: stock > 0 ? "#e8f5e9" : "#f5e8e8",
                color: stock > 0 ? "var(--green)" : "var(--maroon)",
              }}
            >
              {stock > 0 ? `${stock} במלאי` : "אזל"}
            </span>
            <span className="font-extrabold text-xl" style={{ color: "var(--text)" }}>
              ₪{price}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
