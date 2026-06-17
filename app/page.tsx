import { prisma } from "@/lib/db";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import HeroSection from "@/components/HeroSection";
import WhatsAppBubble from "@/components/WhatsAppBubble";
import NewsletterSection from "@/components/NewsletterSection";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "SWEBO | קולקציית מונדיאל 2026",
  description: "BUILT ON UNIQUENESS – קולקציית מונדיאל 2026. בגדים מעוצבים במידות S–XL, משלוח מהיר לכל הארץ, תשלום מאובטח.",
  openGraph: {
    title: "SWEBO | קולקציית מונדיאל 2026",
    description: "BUILT ON UNIQUENESS – קולקציית מונדיאל 2026. בגדים מעוצבים במידות S–XL, משלוח מהיר לכל הארץ.",
    type: "website",
  },
};

interface Props {
  searchParams: Promise<{ category?: string }>;
}

export default async function HomePage({ searchParams }: Props) {
  const { category: filterCategoryId } = await searchParams;

  const [allCategories, products, configRows] = await Promise.all([
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.product.findMany({
      where: {
        active: true,
        ...(filterCategoryId ? { categories: { some: { id: filterCategoryId } } } : {}),
      },
      orderBy: { createdAt: "asc" },
      include: {
        categories: true,
        colors: {
          orderBy: { sortOrder: "asc" },
          include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
          take: 1,
        },
      },
    }),
    prisma.siteConfig.findMany(),
  ]);

  const cfg: Record<string, string> = {};
  configRows.forEach((r) => { cfg[r.key] = r.value; });

  // Group products by category (uncategorised at the end)
  const grouped: { id: string | null; nameHe: string; products: typeof products }[] = [];

  if (filterCategoryId) {
    // Single category view — no grouping header needed
    grouped.push({ id: filterCategoryId, nameHe: allCategories.find((c) => c.id === filterCategoryId)?.nameHe ?? "", products });
  } else if (allCategories.length === 0) {
    grouped.push({ id: null, nameHe: "", products });
  } else {
    // Group: each category (product can appear in multiple groups), then uncategorised
    for (const cat of allCategories) {
      const catProducts = products.filter((p) => p.categories.some((c) => c.id === cat.id));
      if (catProducts.length > 0) grouped.push({ id: cat.id, nameHe: cat.nameHe, products: catProducts });
    }
    const uncategorised = products.filter((p) => p.categories.length === 0);
    if (uncategorised.length > 0) grouped.push({ id: null, nameHe: "מוצרים נוספים", products: uncategorised });
  }

  const showCategoryHeaders = !filterCategoryId && allCategories.length > 0;

  return (
    <>
      <Header />

      {/* Full-viewport hero */}
      <HeroSection
        slogan={cfg["hero.slogan"]}
        catalogName={cfg["hero.catalogName"]}
        imagePath={cfg["hero.imagePath"]}
        videoPath={cfg["hero.videoPath"]}
      />

      <main className="max-w-6xl mx-auto px-4 py-10">

        {/* Category filter pill (when filtering) */}
        {filterCategoryId && (
          <div className="flex justify-end mb-6">
            <a
              href="/"
              className="text-sm font-medium px-4 py-2 rounded-full border flex items-center gap-2 hover:opacity-70 transition-opacity"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              הצג הכל
            </a>
          </div>
        )}

        {/* Products (grouped) */}
        {products.length === 0 ? (
          <div className="text-center py-20" style={{ color: "var(--text-muted)" }}>
            <div className="mb-4"></div>
            <p className="text-xl">מוצרים יגיעו בקרוב...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-12">
            {grouped.map((group) => (
              <section key={group.id ?? "__uncategorised"}>
                {showCategoryHeaders && group.nameHe && (
                  <h2 className="text-xl font-extrabold mb-5 text-right" style={{ color: "var(--text)" }}>
                    {group.nameHe}
                  </h2>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                  {group.products.map((p) => {
                    const displayImg = p.colors[0]?.images[0]?.url || p.image;
                    const totalStock = p.colors.length > 0
                      ? p.colors.reduce((s, c) => s + c.stock, 0)
                      : p.stock;
                    return (
                      <ProductCard
                        key={p.id}
                        id={p.id}
                        nameHe={p.nameHe}
                        price={p.price}
                        image={displayImg}
                        stock={totalStock}
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Info strip */}
        <section
          className="mt-16 rounded-2xl p-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-center border"
          style={{ background: "var(--cream-dark)", borderColor: "var(--border)" }}
        >
          {[
            { title: "משלוח ₪40", sub: "לכל הארץ · או איסוף עצמי חינם" },
            { title: "מידות S–XL", sub: "בחר מידה בעמוד המוצר" },
            { title: "תשלום מאובטח", sub: "דרך HYP" },
          ].map((item) => (
            <div key={item.title}>
              <div className="font-bold" style={{ color: "var(--text)" }}>{item.title}</div>
              <div className="text-sm" style={{ color: "var(--text-muted)" }}>{item.sub}</div>
            </div>
          ))}
        </section>

        {/* Newsletter */}
        <div className="mt-10">
          <NewsletterSection />
        </div>

        {/* Contact */}
        <section
          id="contact"
          className="mt-10 rounded-2xl p-8 text-center border"
          style={{ background: "var(--cream-dark)", borderColor: "var(--border)" }}
        >
          <h2 className="text-xl font-extrabold mb-6" style={{ color: "var(--text)" }}>צור קשר</h2>
          <div className="flex justify-center gap-6 flex-wrap">
            {(cfg["contact.whatsapp"] || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER) && (
              <a
                href={(() => { const v = cfg["contact.whatsapp"] || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || ""; return v.startsWith("http") ? v : `https://wa.me/${v}`; })()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-6 py-3 rounded-2xl font-bold text-white transition-opacity hover:opacity-80"
                style={{ background: "#25D366" }}
              >
                <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </a>
            )}
            {cfg["contact.instagram"] && (
              <a
                href={cfg["contact.instagram"]}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-6 py-3 rounded-2xl font-bold text-white transition-opacity hover:opacity-80"
                style={{ background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }}
              >
                <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                Instagram
              </a>
            )}
            {cfg["contact.tiktok"] && (
              <a
                href={cfg["contact.tiktok"]}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-6 py-3 rounded-2xl font-bold text-white transition-opacity hover:opacity-80"
                style={{ background: "#000" }}
              >
                <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.28 6.28 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/>
                </svg>
                TikTok
              </a>
            )}
            {cfg["contact.email"] && (
              <a
                href={`mailto:${cfg["contact.email"]}`}
                className="flex items-center gap-3 px-6 py-3 rounded-2xl font-bold text-white transition-opacity hover:opacity-80"
                style={{ background: "var(--maroon)" }}
              >
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
                אימייל
              </a>
            )}
          </div>
        </section>
      </main>

      <footer
        className="mt-16 border-t py-6 text-center text-sm"
        style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
      >
        <div className="flex justify-center gap-6 mb-3">
          <a href="/terms" className="hover:underline">תנאי שימוש</a>
          <a href="/privacy" className="hover:underline">מדיניות פרטיות</a>
          <a href="/admin-login" className="hover:underline opacity-40">Admin</a>
        </div>
        © {new Date().getFullYear()} · כל הזכויות שמורות
      </footer>

      <WhatsAppBubble />
    </>
  );
}
