import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "700", "800"],
  variable: "--font-heebo",
});

export const metadata: Metadata = {
  title: "SWEBO | חנות חולצות",
  description: "חולצות בסגנון ספורט מעוצבות בצבעים מט',",
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
