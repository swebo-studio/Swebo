/**
 * An order line's name and photo as they were when it was bought. Lines from
 * before the copy existed fall back to the live product, if it still exists.
 */
export const DELETED_PRODUCT_NAME = "מוצר שנמחק";

export function orderItemName(item: { productName?: string | null; product?: { nameHe: string } | null }): string {
  return item.productName || item.product?.nameHe || DELETED_PRODUCT_NAME;
}

export function orderItemImage(item: { productImage?: string | null; product?: { image?: string | null } | null }): string | null {
  return item.productImage || item.product?.image || null;
}

/** The photo to keep for a line: the bought colour's first photo, else the product's. */
export function snapshotImage(
  product: { image: string; colors?: { nameHe: string; imageUrl: string | null; images?: { url: string; sortOrder: number }[] }[] },
  color: string | null | undefined,
): string | null {
  const c = color ? product.colors?.find((x) => x.nameHe === color) : undefined;
  const first = c?.images?.slice().sort((a, b) => a.sortOrder - b.sortOrder)[0]?.url;
  return first || c?.imageUrl || product.image || null;
}
