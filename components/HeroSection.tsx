"use client";
import Image from "next/image";
import { useState } from "react";

interface Props {
  slogan?: string;
  catalogName?: string;
  imagePath?: string;
  videoPath?: string;
}

export default function HeroSection({ slogan, catalogName, imagePath, videoPath }: Props) {
  const [videoError, setVideoError] = useState(false);
  const effectiveVideo = videoError ? undefined : videoPath;
  const hasMedia = effectiveVideo || imagePath;

  return (
    <section
      className="relative w-full overflow-hidden flex items-end"
      style={{ height: "50svh" }}
    >
      {/* Background: video or image */}
      {effectiveVideo ? (
        <video
          src={effectiveVideo}
          autoPlay
          muted
          loop
          playsInline
          onError={() => setVideoError(true)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : imagePath ? (
        <Image
          src={imagePath}
          alt="hero"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
      ) : (
        /* Fallback gradient when no media */
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(160deg, var(--cream-dark) 0%, var(--cream) 100%)" }}
        />
      )}

      {/* Dark overlay */}
      <div
        className="absolute inset-0"
        style={{ background: hasMedia ? "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.15) 60%, transparent 100%)" : "none" }}
      />

      {/* Text — bottom of viewport */}
      <div className="relative z-10 w-full px-8 pb-14 text-right">
        {catalogName && (
          <p
            className="text-sm font-bold tracking-[0.2em] uppercase mb-3"
            style={{ color: hasMedia ? "rgba(255,255,255,0.75)" : "var(--text-muted)" }}
          >
            {catalogName}
          </p>
        )}
        {slogan && (
          <h1
            className="text-4xl md:text-6xl font-extrabold leading-tight"
            style={{
              color: hasMedia ? "white" : "var(--text)",
              textShadow: hasMedia ? "0 2px 16px rgba(0,0,0,0.6)" : "none",
            }}
          >
            {slogan}
          </h1>
        )}
        {!slogan && !catalogName && (
          <h1
            className="text-4xl md:text-6xl font-extrabold leading-tight"
            style={{ color: hasMedia ? "white" : "var(--text)" }}
          >
            הקולקציה שלנו
          </h1>
        )}
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 opacity-60">
        <svg width="20" height="20" fill="none" stroke={hasMedia ? "white" : "var(--text)"} strokeWidth="2" viewBox="0 0 24 24">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </section>
  );
}
