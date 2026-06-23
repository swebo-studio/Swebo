import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Link from "next/link";
import CartClearer from "@/components/CartClearer";

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
  const isEpost = order.deliveryMode === "epost";
  const isSelfPickup = order.deliveryMode === "self" || order.address === "איסוף עצמי";
  const orderCode = order.id.slice(-6).toUpperCase();

  return (
    <>
      <Header />
      {isPaid && <CartClearer />}
      <main className="max-w-lg mx-auto px-4 py-12 text-right" dir="rtl">

        {/* Hero */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-5"
            style={{ background: isPaid ? "#e8f5e9" : "#f5e8e8", color: isPaid ? "var(--green)" : "#b08c00" }}
          >
            {isPaid
              ? <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              : <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            }
          </div>
          <h1 className="text-3xl font-extrabold mb-2" style={{ color: "var(--text)" }}>
            {isPaid ? "תודה על הזמנתך!" : "ההזמנה התקבלה"}
          </h1>
          <p className="text-lg" style={{ color: "var(--text-muted)" }}>
            {isPaid
              ? "אנחנו כבר מכינים את ההזמנה שלך!"
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
            <span className="flex items-center gap-2 justify-end">
              {isSelfPickup
                ? <><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>איסוף עצמי</>
                : isEpost
                ? <><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/></svg>נקודת EPOST</>
                : <><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>פרטי משלוח</>
              }
            </span>
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
          {!isSelfPickup && (
            <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
              משלוח עד חמישה ימי עסקים ·{" "}
              <Link href="/yeshuvim-meruhakim" className="underline underline-offset-2 hover:opacity-70">
                יישובים מרוחקים
              </Link>
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
                { icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0018 9h-1.26A8 8 0 103 16.29"/></svg>, title: "ההזמנה התקבלה", done: true },
                { icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>, title: "ארוז ונשלח תוך 1-2 ימי עסקים", done: false },
                {
                  icon: isSelfPickup
                    ? <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    : isEpost
                    ? <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
                    : <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
                  title: isSelfPickup ? "מוכן לאיסוף" : isEpost ? "זמין לאיסוף בנקודת EPOST" : "משלוח עד הבית",
                  done: false,
                },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: step.done ? "#e8f5e9" : "var(--cream)",
                      border: `2px solid ${step.done ? "var(--green)" : "var(--border)"}`,
                      color: step.done ? "var(--green)" : "var(--text-muted)",
                    }}
                  >
                    {step.icon}
                  </div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: step.done ? "var(--green)" : "var(--text)" }}
                  >
                    {step.title}
                  </p>
                  {step.done && (
                    <span className="mr-auto" style={{ color: "var(--green)" }}><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></span>
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
