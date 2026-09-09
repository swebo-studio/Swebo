import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import NewsletterPopup from "@/components/NewsletterPopup";
import AccessibilityWidget from "@/components/AccessibilityWidget";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "700", "800"],
  variable: "--font-heebo",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://swebo.co.il";

// Re-applies the visitor's saved accessibility preferences before the first
// paint. Doing it in the widget's effect instead means a returning user with
// high contrast on sees a flash of the normal cream palette on every page.
// The class names and font steps mirror components/AccessibilityWidget.tsx.
const A11Y_BOOT = `(function(){try{
var p=JSON.parse(localStorage.getItem('a11y_prefs')||'{}');
var steps=[1,1.1,1.2,1.35,1.5];
var i=Math.min(Math.max(p.fontStep||0,0),steps.length-1);
var e=document.documentElement;
e.style.setProperty('--a11y-font-scale',String(steps[i]));
var map={contrast:'a11y-contrast',invert:'a11y-invert',lightBg:'a11y-light-bg',grayscale:'a11y-grayscale',highlightLinks:'a11y-highlight-links',readableFont:'a11y-readable-font',noMotion:'a11y-no-motion'};
for(var k in map){if(p[k])e.classList.add(map[k]);}
}catch(err){}})();`;

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
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // The boot script below writes a class and a font-scale variable onto
    // <html> before React hydrates, which React would otherwise flag as a
    // server/client mismatch.
    <html lang="he" dir="rtl" className={heebo.variable} suppressHydrationWarning>
      <body className="min-h-screen" style={{ fontFamily: "var(--font-heebo), sans-serif" }}>
        <Script id="a11y-boot" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: A11Y_BOOT }} />
        <a href="#main-content" className="skip-link">דלג לתוכן הראשי</a>
        <CartProvider>
          {children}
          <NewsletterPopup />
          <AccessibilityWidget />
        </CartProvider>
      </body>
    </html>
  );
}
