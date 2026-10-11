import type { Category, Condition, ListItem, Product, Promotion, Reward } from "./types";

function conditionText(c: Condition, products: Product[]) {
  if (c.type === "min_cart_total") return `סל מעל ₪${c.minTotal}`;
  if (c.type === "product_in_cart") {
    const p = products.find((x) => x.id === c.productId);
    return `מוצר בסל: ${p?.nameHe ?? c.productId}`;
  }
  return c.type;
}

function rewardText(r: Reward, products: Product[]) {
  if (r.type === "free_shipping") return "משלוח חינם";
  if (r.type === "cart_discount") {
    if (r.discountAmount) return `₪${r.discountAmount} הנחה על הסל`;
    return `${r.discountPct}% הנחה על כל הסל`;
  }
  if (r.type === "product_discount") {
    const p = products.find((x) => x.id === r.productId);
    const pct = r.discountPct === 100 ? "חינם" : `${r.discountPct}% הנחה`;
    const scope = !r.maxUnits ? "כל הפריטים בסל" : r.maxUnits === 1 ? "פריט אחד בלבד" : `עד ${r.maxUnits} פריטים`;
    return `${pct} על ${p?.nameHe ?? r.productId} · ${scope}`;
  }
  return r.type;
}

/** "Winter, Summer · 4 products" — a list, in as few words as fit on a card. */
function listText(items: ListItem[], role: ListItem["role"], products: Product[], categories: Category[]) {
  const mine = items.filter((i) => i.role === role);
  const categoryNames = mine.flatMap((i) => categories.find((c) => c.id === i.categoryId)?.nameHe ?? []);
  const productNames = mine.flatMap((i) => products.find((p) => p.id === i.productId)?.nameHe ?? []);
  const parts = [...categoryNames];
  if (productNames.length === 1) parts.push(productNames[0]);
  else if (productNames.length > 1) parts.push(`${productNames.length} מוצרים`);
  return parts.join(" · ") || "—";
}

function Box({ title, lines }: { title: string; lines: React.ReactNode[] }) {
  return (
    <div className="rounded-xl p-3" style={{ background: "var(--cream-dark)" }}>
      <p className="font-bold mb-1.5 text-right text-xs" style={{ color: "var(--text-muted)" }}>{title}</p>
      {lines.map((line, i) => (
        <p key={i} className="text-right text-xs mb-0.5" style={{ color: "var(--text)" }}>{line}</p>
      ))}
    </div>
  );
}

const repeatText = (max: number | null) => (max === 1 ? "פעם אחת בהזמנה" : "חוזר על עצמו בכל הזמנה");

/** The body of a promotion's card in the admin list. */
export default function PromotionSummary({ p, products, categories }: { p: Promotion; products: Product[]; categories: Category[] }) {
  if (p.kind === "bundle") {
    return (
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Box title="מבצע" lines={[<b key="b">{p.buyQuantity} פריטים ב-₪{p.bundlePrice}</b>, repeatText(p.maxApplications)]} />
        <Box title="מתוך" lines={[listText(p.items, "buy", products, categories)]} />
      </div>
    );
  }

  if (p.kind === "buy_get") {
    const gift = p.getDiscountPct === 100 ? "חינם" : `ב-${p.getDiscountPct}% הנחה`;
    return (
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Box title={`קונים ${p.buyQuantity}`} lines={[listText(p.items, "buy", products, categories)]} />
        <Box
          title={`מקבלים ${p.getQuantity} ${gift}`}
          lines={[listText(p.items, "get", products, categories), repeatText(p.maxApplications)]}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 text-sm">
      <div className="rounded-xl p-3" style={{ background: "var(--cream-dark)" }}>
        <p className="font-bold mb-1.5 text-right text-xs" style={{ color: "var(--text-muted)" }}>
          תנאים {p.conditions.length > 1 && (p.conditionLogic === "any" ? "· מספיק אחד" : "· כולם")}
        </p>
        {p.conditions.length === 0
          ? <p className="text-right text-xs" style={{ color: "var(--text-muted)" }}>ללא תנאים</p>
          : p.conditions.map((c, i) => (
              <p key={i} className="text-right text-xs mb-0.5" style={{ color: "var(--text)" }}>
                {i > 0 && (
                  <span className="font-bold" style={{ color: "var(--text-muted)" }}>
                    {p.conditionLogic === "any" ? "או " : "וגם "}
                  </span>
                )}
                {conditionText(c, products)}
              </p>
            ))
        }
      </div>
      <div className="rounded-xl p-3" style={{ background: "var(--cream-dark)" }}>
        <p className="font-bold mb-1.5 text-right text-xs" style={{ color: "var(--text-muted)" }}>פרסים</p>
        {p.rewards.length === 0
          ? <p className="text-right text-xs" style={{ color: "var(--text-muted)" }}>ללא פרסים</p>
          : p.rewards.map((r, i) => (
              <p key={i} className="text-right text-xs mb-0.5 flex items-center gap-1 justify-end" style={{ color: "var(--green)" }}><svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>{rewardText(r, products)}</p>
            ))
        }
      </div>
    </div>
  );
}
