import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import ProductDetail from "@/components/ProductDetail";
import WhatsAppBubble from "@/components/WhatsAppBubble";
import { Suspense } from "react";

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
  const [product, configRows] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        colors: {
          orderBy: { sortOrder: "asc" },
          include: { images: { orderBy: { sortOrder: "asc" } } },
        },
      },
    }),
    prisma.siteConfig.findMany(),
  ]);

  if (!product || !product.active) notFound();

  const cfg: Record<string, string> = {};
  configRows.forEach((r) => { cfg[r.key] = r.value; });

  let sizeChart: { size: string; chest: number; waist: number; length: number }[] = [];
  try { if (cfg["sizeChart"]) sizeChart = JSON.parse(cfg["sizeChart"]); } catch {}

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
        <div className="text-right mb-6">
          <span className="text-4xl font-extrabold" style={{ color: "var(--text)" }}>₪{product.price}</span>
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
          />
        </Suspense>
      </main>
      <WhatsAppBubble />
    </>
  );
}
