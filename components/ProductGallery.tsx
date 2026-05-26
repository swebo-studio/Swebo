"use client";
import { useState } from "react";
import Image from "next/image";

interface Props {
  images: string[];
  alt: string;
}

export default function ProductGallery({ images, alt }: Props) {
  const [mainImg, setMainImg] = useState(images[0] ?? "");

  return (
    <div className="flex flex-col gap-3">
      <div
        className="rounded-2xl overflow-hidden border aspect-square relative"
        style={{ borderColor: "var(--border)", background: "var(--cream-dark)" }}
      >
        {mainImg ? (
          <Image src={mainImg} alt={alt} fill className="object-cover" priority />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-8xl">👕</div>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 flex-wrap justify-center">
          {images.map((url, i) => (
            <button
              key={i}
              onClick={() => setMainImg(url)}
              className="relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all"
              style={{
                borderColor: mainImg === url ? "var(--text)" : "var(--border)",
              }}
            >
              <Image src={url} alt={`תמונה ${i + 1}`} fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
