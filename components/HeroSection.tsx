"use client";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";

interface Props {
  slogan?: string;
  catalogName?: string;
  imagePath?: string;
  videoPath?: string;
  imagePathMobile?: string;
  videoPathMobile?: string;
}

const MOBILE_BREAKPOINT = 768;

export default function HeroSection({ slogan, catalogName, imagePath, videoPath, imagePathMobile, videoPathMobile }: Props) {
  const [videoError, setVideoError] = useState(false);
  // Default to desktop media on the server/first paint to avoid a hydration
  // mismatch; switches to the mobile variant right after mount if needed.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const effectiveImagePath = isMobile ? (imagePathMobile || imagePath) : imagePath;
  const effectiveVideoPathRaw = isMobile ? (videoPathMobile || videoPath) : videoPath;
  useEffect(() => { setVideoError(false); }, [effectiveVideoPathRaw]);
  const effectiveVideo = videoError ? undefined : effectiveVideoPathRaw;
  const hasMedia = effectiveVideo || effectiveImagePath;
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !effectiveVideo) return;
    // iOS Safari checks the `muted` attribute at parse time, before React's
    // JS-set property takes effect — setting it explicitly here (and calling
    // play() ourselves) makes autoplay reliable on iPhone.
    video.muted = true;
    video.play().catch(() => {});
  }, [effectiveVideo]);

  return (
    <section
      className="relative w-full overflow-hidden flex items-end"
      style={{ height: "50svh" }}
    >
      {/* Background: video or image */}
      {effectiveVideo ? (
        <video
          key={effectiveVideo}
          ref={videoRef}
          src={effectiveVideo}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onError={() => setVideoError(true)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : effectiveImagePath ? (
        <Image
          key={effectiveImagePath}
          src={effectiveImagePath}
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
