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
          alignItems: "center",
          justifyContent: "center",
          background: "#1A1814",
        }}
      >
        <div
          style={{
            background: "#F5F0E8",
            borderRadius: 32,
            padding: "48px 96px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://swebo.co.il/logo.png"
            alt="SWEBO"
            width={480}
            height={200}
            style={{ objectFit: "contain" }}
          />
          <p
            style={{
              fontFamily: "sans-serif",
              fontSize: 18,
              color: "#6B6B6B",
              letterSpacing: "0.4em",
              margin: 0,
            }}
          >
            BUILT ON UNIQUENESS
          </p>
        </div>
      </div>
    ),
    { ...size }
  );
}
