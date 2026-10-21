// See app/cart/layout.tsx — the checkout page is a client component too.
export const metadata = { title: "פרטי הזמנה", robots: { index: false, follow: true } };

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
