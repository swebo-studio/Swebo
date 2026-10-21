// A "use client" page cannot export metadata, and Next.js announces the page
// title on every client-side navigation — so the cart needs its own layout to
// stop being announced as the home page.
// Kept out of search results: Google had indexed the empty cart as
// "העגלה שלך ריקה" and listed it among the store's top links.
export const metadata = { title: "עגלת הקניות", robots: { index: false, follow: true } };

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
