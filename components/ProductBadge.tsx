import { BADGE_POSITION_CLASS, BADGE_SIZE_CLASS, badgeTextColor, type CardBadge } from "@/lib/promotionBadges";

/** One pill on a product image — a promotion's tag, or the low-stock warning. */
export function ProductBadge({ badge }: { badge: Omit<CardBadge, "position"> }) {
  return (
    <span
      // English text ("NEW DROP 🔥") keeps its own order on the RTL page
      dir="auto"
      // A long text wraps inside the card rather than running off it; rounded-2xl is still a pill on one line
      className={`${BADGE_SIZE_CLASS[badge.size]} max-w-full font-bold rounded-2xl leading-tight text-center break-words shadow-sm`}
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
