import { BADGE_POSITION_CLASS, BADGE_SIZE_CLASS, badgeTextColor, type CardBadge } from "@/lib/promotionBadges";

/** One pill on a product image — a promotion's tag, or the low-stock warning. */
export function ProductBadge({ badge }: { badge: Omit<CardBadge, "position"> }) {
  return (
    <span
      className={`${BADGE_SIZE_CLASS[badge.size]} font-bold rounded-full leading-tight whitespace-nowrap shadow-sm`}
      style={{ background: badge.color, color: badgeTextColor(badge.color) }}
    >
      {badge.text}
    </span>
  );
}

/**
 * Every tag in its corner. Tags that share a corner stack instead of covering
 * each other, so "last in stock" and an offer can sit together.
 */
export function ProductBadges({ badges }: { badges: CardBadge[] }) {
  const corners = Object.keys(BADGE_POSITION_CLASS) as CardBadge["position"][];
  return (
    <>
      {corners.map((corner) => {
        const here = badges.filter((b) => b.position === corner);
        if (here.length === 0) return null;
        return (
          <div key={corner} className={`absolute ${BADGE_POSITION_CLASS[corner]} flex flex-col gap-1 max-w-[calc(100%-1rem)] pointer-events-none`}>
            {here.map((b, i) => <ProductBadge key={i} badge={b} />)}
          </div>
        );
      })}
    </>
  );
}
