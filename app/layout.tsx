import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "700", "800"],
  variable: "--font-heebo",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://swebo.co.il";

export const metadata: Metadata = {
  title: {
    default: "SWEBO | קולקציית מונדיאל 2026",
    template: "%s | SWEBO",
  },
  description: "BUILT ON UNIQUENESS – קולקציית מונדיאל 2026. בגדים מעוצבים במידות S–XL, משלוח מהיר לכל הארץ, תשלום מאובטח.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    siteName: "SWEBO",
    locale: "he_IL",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "SWEBO – BUILT ON UNIQUENESS" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body className="min-h-screen" style={{ fontFamily: "var(--font-heebo), sans-serif" }}>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
