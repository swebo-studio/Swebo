import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import ProductDetail from "@/components/ProductDetail";

export const dynamic = "force-dynamic";

export default async function ProductPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      colors: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!product || !product.active) notFound();

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
          <span className="text-4xl font-extrabold" style={{ color: "var(--text)" }}>
            ₪{product.price}
          </span>
        </div>
        <ProductDetail
          product={{
            id: product.id,
            nameHe: product.nameHe,
            price: product.price,
            image: product.image,
            stock: product.stock,
            images: product.images,
            colors: product.colors,
          }}
        />
      </main>
    </>
  );
}
