import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import ProductDetail from "@/components/ProductDetail";
import ProductCard from "@/components/ProductCard";
import WhatsAppBubble from "@/components/WhatsAppBubble";
import { Suspense } from "react";
import { computeDisplayPrice } from "@/lib/promotions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { colors: { orderBy: { sortOrder: "asc" }, include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } }, take: 1 } },
  });
  if (!product) return {};

  const ogImage = product.colors[0]?.images[0]?.url || product.image || undefined;
  const description = `${product.nameHe} – זמין במגוון צבעים ומידות. ₪${product.price} | BUILT ON UNIQUENESS`;

  return {
    title: product.nameHe,
    description,
    openGraph: {
      title: `${product.nameHe} | SWEBO`,
      description,
      type: "website",
      ...(ogImage ? { images: [{ url: ogImage, width: 800, height: 800, alt: product.nameHe }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.nameHe} | SWEBO`,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default async function ProductPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [product, configRows, activePromotions] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        categories: true,
        colors: {
          orderBy: { sortOrder: "asc" },
          include: { images: { orderBy: { sortOrder: "asc" } } },
        },
      },
    }),
    prisma.siteConfig.findMany(),
    prisma.promotion.findMany({ where: { active: true }, include: { rewards: true } }),
  ]);

  const cartDiscountPct = activePromotions
    .flatMap((p) => p.rewards)
    .filter((r) => r.type === "cart_discount" && r.discountPct)
    .reduce((max, r) => Math.max(max, r.discountPct ?? 0), 0);

  if (!product || !product.active) notFound();

  const { displayPrice, originalPrice } = computeDisplayPrice(product.price, product.comparePrice, cartDiscountPct);

  const cfg: Record<string, string> = {};
  configRows.forEach((r) => { cfg[r.key] = r.value; });

  let sizeChart: { size: string; chest: number; waist: number; length: number }[] = [];
  try { if (cfg["sizeChart"]) sizeChart = JSON.parse(cfg["sizeChart"]); } catch {}
  const showSizeChart = cfg["sizeChart.showTable"] !== "false";

  let sizeGuideImages: string[] = [];
  try {
    const parsed = cfg["sizeGuide.imagePaths"] ? JSON.parse(cfg["sizeGuide.imagePaths"]) : null;
    if (Array.isArray(parsed) && parsed.length > 0) sizeGuideImages = parsed;
    else if (cfg["sizeGuide.imagePath"]) sizeGuideImages = [cfg["sizeGuide.imagePath"]];
  } catch { if (cfg["sizeGuide.imagePath"]) sizeGuideImages = [cfg["sizeGuide.imagePath"]]; }

  // Other products from the same catalog/categories
  const categoryIds = product.categories.map((c) => c.id);
  const relatedProducts = categoryIds.length > 0
    ? await prisma.product.findMany({
        where: {
          active: true,
          id: { not: product.id },
          categories: { some: { id: { in: categoryIds } } },
        },
        orderBy: { createdAt: "asc" },
        include: {
          colors: {
            orderBy: { sortOrder: "asc" },
            include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
            take: 1,
          },
        },
      })
    : [];

  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-extrabold mb-1 text-right" style={{ color: "var(--text)" }}>
          {product.nameHe}
        </h1>
        {product.descriptionHe && (
          <p className="text-sm mb-8 text-right" style={{ color: "var(--text-muted)" }}>
            {product.descriptionHe}
          </p>
        )}
        <div className="text-right mb-6 flex items-baseline gap-3 justify-end">
          {originalPrice ? (
            <>
              <span className="text-2xl line-through" style={{ color: "var(--text-muted)" }}>₪{originalPrice}</span>
              <span className="text-4xl font-extrabold" style={{ color: "var(--maroon)" }}>₪{displayPrice}</span>
            </>
          ) : (
            <span className="text-4xl font-extrabold" style={{ color: "var(--text)" }}>₪{product.price}</span>
          )}
        </div>
        <Suspense>
          <ProductDetail
            product={{
              id: product.id,
              nameHe: product.nameHe,
              price: product.price,
              image: product.image,
              stock: product.stock,
              colors: product.colors,
            }}
            sizeChart={sizeChart}
            showSizeChart={showSizeChart}
            sizeGuideImages={sizeGuideImages.length > 0 ? sizeGuideImages : undefined}
            sizeGuideImage={sizeGuideImages[0] || undefined}
            detailsHe={product.detailsHe}
          />
        </Suspense>

        {relatedProducts.length > 0 && (
          <section className="mt-16">
            <h2 className="text-xl font-extrabold mb-5 text-right" style={{ color: "var(--text)" }}>
              עוד מהקטלוג
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {relatedProducts.map((p) => {
                const displayImg = p.colors[0]?.images[0]?.url || p.image;
                const totalStock = p.colors.length > 0
                  ? p.colors.reduce((s, c) => s + c.stock, 0)
                  : p.stock;
                const related = computeDisplayPrice(p.price, p.comparePrice, cartDiscountPct);
                return (
                  <ProductCard
                    key={p.id}
                    id={p.id}
                    nameHe={p.nameHe}
                    price={related.originalPrice ?? p.price}
                    image={displayImg}
                    stock={totalStock}
                    discountedPrice={related.originalPrice ? related.displayPrice : undefined}
                  />
                );
              })}
            </div>
          </section>
        )}
      </main>
      <WhatsAppBubble number={cfg["contact.whatsapp"] || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || ""} />
    </>
  );
}
