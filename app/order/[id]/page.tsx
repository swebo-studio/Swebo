import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function OrderPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { product: true } } },
  });
  if (!order) notFound();

  const isPaid = order.status === "paid";
  const isEpost = order.delivery === 0 && order.address && !order.address.includes("איסוף עצמי");
  const isSelfPickup = order.address === "איסוף עצמי";
  const orderCode = order.id.slice(-6).toUpperCase();

  return (
    <>
      <Header />
      <main className="max-w-lg mx-auto px-4 py-12 text-right" dir="rtl">

        {/* Hero */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center justify-center w-24 h-24 rounded-full text-5xl mb-5"
            style={{ background: isPaid ? "#e8f5e9" : "#f5e8e8" }}
          >
            {isPaid ? "✅" : "⏳"}
          </div>
          <h1 className="text-3xl font-extrabold mb-2" style={{ color: "var(--text)" }}>
            {isPaid ? "תודה על הזמנתך!" : "ההזמנה התקבלה"}
          </h1>
          <p className="text-lg" style={{ color: "var(--text-muted)" }}>
            {isPaid
              ? "אנחנו כבר מכינים את ההזמנה שלך 🎉"
              : "נעדכן אותך ברגע שהתשלום יאושר"}
          </p>
          <p className="mt-3 font-mono text-sm px-4 py-2 rounded-full inline-block" style={{ background: "var(--cream-dark)", color: "var(--text-muted)" }}>
            הזמנה מס&apos; <strong style={{ color: "var(--text)" }}>{orderCode}</strong>
          </p>
        </div>

        {/* Order items */}
        <div
          className="rounded-2xl border mb-4 overflow-hidden"
          style={{ background: "var(--cream-dark)", borderColor: "var(--border)" }}
        >
          <div className="px-5 pt-4 pb-2 border-b" style={{ borderColor: "var(--border)" }}>
            <h2 className="font-bold text-base" style={{ color: "var(--text)" }}>פרטי ההזמנה</h2>
          </div>
          <div className="px-5 py-3 flex flex-col gap-2.5">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3">
                <span className="font-bold text-sm" style={{ color: "var(--text)" }}>
                  ₪{item.price * item.quantity}
                </span>
                <div className="text-right">
                  <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                    {item.product.nameHe} × {item.quantity}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    מידה {item.size}{item.color ? ` · ${item.color}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t flex flex-col gap-1.5" style={{ borderColor: "var(--border)" }}>
            {order.delivery > 0 && (
              <div className="flex justify-between text-sm" style={{ color: "var(--text-muted)" }}>
                <span>₪{order.delivery}</span>
                <span>משלוח</span>
              </div>
            )}
            <div
              className="flex justify-between font-extrabold text-xl pt-2 border-t"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            >
              <span>₪{order.total}</span>
              <span>סה&quot;כ</span>
            </div>
          </div>
        </div>

        {/* Delivery info */}
        <div
          className="rounded-2xl border mb-4 px-5 py-4"
          style={{ background: "var(--cream-dark)", borderColor: "var(--border)" }}
        >
          <h2 className="font-bold text-base mb-3" style={{ color: "var(--text)" }}>
            {isSelfPickup ? "🏪 איסוף עצמי" : isEpost ? "📦 נקודת EPOST" : "🚚 פרטי משלוח"}
          </h2>
          <p className="text-sm" style={{ color: "var(--text)" }}>{order.customerName}</p>
          {!isSelfPickup && (
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{order.address}, {order.city}</p>
          )}
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{order.customerPhone}</p>
          {order.shipmentNumber && (
            <p className="text-xs mt-2 font-mono px-2 py-1 rounded-lg inline-block" style={{ background: "#e8f5e9", color: "var(--green)" }}>
              מספר משלוח: {order.shipmentNumber}
            </p>
          )}
        </div>

        {/* Delivery timeline */}
        {isPaid && (
          <div
            className="rounded-2xl border mb-8 px-5 py-4"
            style={{ background: "var(--cream-dark)", borderColor: "var(--border)" }}
          >
            <h2 className="font-bold text-base mb-4" style={{ color: "var(--text)" }}>מה הלאה?</h2>
            <div className="flex flex-col gap-4">
              {[
                { emoji: "📥", title: "ההזמנה התקבלה", done: true },
                { emoji: "📦", title: "ארוז ונשלח תוך 1-2 ימי עסקים", done: false },
                { emoji: isSelfPickup ? "🏪" : isEpost ? "📬" : "🚚",
                  title: isSelfPickup ? "מוכן לאיסוף" : isEpost ? "זמין לאיסוף בנקודת EPOST" : "משלוח עד הבית", done: false },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0"
                    style={{
                      background: step.done ? "#e8f5e9" : "var(--cream)",
                      border: `2px solid ${step.done ? "var(--green)" : "var(--border)"}`,
                    }}
                  >
                    {step.emoji}
                  </div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: step.done ? "var(--green)" : "var(--text)" }}
                  >
                    {step.title}
                  </p>
                  {step.done && (
                    <span className="text-xs font-bold mr-auto" style={{ color: "var(--green)" }}>✓</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <Link
          href="/"
          className="w-full block text-center py-4 rounded-2xl font-bold text-lg transition-opacity hover:opacity-80"
          style={{ background: "var(--text)", color: "var(--cream)" }}
        >
          חזרה לחנות
        </Link>
      </main>
    </>
  );
}
