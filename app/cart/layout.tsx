// A "use client" page cannot export metadata, and Next.js announces the page
// title on every client-side navigation — so the cart needs its own layout to
// stop being announced as the home page.
export const metadata = { title: "עגלת הקניות" };

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
