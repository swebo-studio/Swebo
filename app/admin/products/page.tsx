import { prisma } from "@/lib/db";
import ProductsManager from "@/components/ProductsManager";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      colors: { orderBy: { sortOrder: "asc" } },
    },
  });

  return <ProductsManager initialProducts={products} />;
}
