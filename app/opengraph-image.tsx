import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5efe6",
          gap: 24,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://swebo.co.il/logo.png"
          alt="SWEBO"
          width={320}
          height={160}
          style={{ objectFit: "contain" }}
        />
        <p
          style={{
            fontFamily: "sans-serif",
            fontSize: 28,
            fontWeight: 700,
            color: "#2a1a0e",
            letterSpacing: "0.15em",
            margin: 0,
          }}
        >
          BUILT ON UNIQUENESS
        </p>
        <p
          style={{
            fontFamily: "sans-serif",
            fontSize: 20,
            color: "#7a6a5a",
            margin: 0,
          }}
        >
          קולקציית מונדיאל 2026
        </p>
      </div>
    ),
    { ...size }
  );
}
