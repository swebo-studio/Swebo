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

  return (
    <>
      <Header />
      <main className="max-w-xl mx-auto px-4 py-16 text-right">
        <div className="text-center mb-10">
          <div className="mb-4"></div>
          <h1 className="text-3xl font-extrabold mb-2" style={{ color: "var(--text)" }}>
            {order.status === "paid" ? "תודה על ההזמנה!" : "הזמנה התקבלה"}
          </h1>
          <p style={{ color: "var(--text-muted)" }}>
            מספר הזמנה: <span className="font-mono text-sm">{order.id.slice(-8).toUpperCase()}</span>
          </p>
        </div>

        <div
          className="rounded-2xl border p-6 mb-6"
          style={{ background: "var(--cream-dark)", borderColor: "var(--border)" }}
        >
          <h2 className="font-bold mb-4" style={{ color: "var(--text)" }}>
            פרטי ההזמנה
          </h2>
          {order.items.map((item) => (
            <div
              key={item.id}
              className="flex justify-between text-sm mb-2"
              style={{ color: "var(--text-muted)" }}
            >
              <span>₪{item.price * item.quantity}</span>
              <span>
                {item.product.nameHe} × {item.quantity} (מידה {item.size})
              </span>
            </div>
          ))}
          <div
            className="flex justify-between text-sm mt-3 pt-3 border-t"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
          >
            <span>₪40</span>
            <span>משלוח</span>
          </div>
          <div
            className="flex justify-between font-extrabold text-xl mt-3 pt-3 border-t"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            <span>₪{order.total}</span>
            <span>סה&quot;כ</span>
          </div>
        </div>

        <div
          className="rounded-2xl border p-6 mb-8"
          style={{ background: "var(--cream-dark)", borderColor: "var(--border)" }}
        >
          <h2 className="font-bold mb-3" style={{ color: "var(--text)" }}>
            פרטי משלוח
          </h2>
          <p style={{ color: "var(--text-muted)" }}>{order.customerName}</p>
          <p style={{ color: "var(--text-muted)" }}>{order.address}, {order.city}</p>
          <p style={{ color: "var(--text-muted)" }}>{order.customerPhone}</p>
        </div>

        <Link
          href="/"
          className="w-full block text-center py-4 rounded-2xl font-bold text-lg transition-opacity hover:opacity-80"
          style={{ background: "var(--text)", color: "var(--cream)" }}
        >
          חזור לחנות
        </Link>
      </main>
    </>
  );
}
