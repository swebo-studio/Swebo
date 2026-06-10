const AT_BASE = "https://webapi.mymarketing.co.il/api";

function atHeaders() {
  return {
    "Authorization": `Bearer ${process.env.ACTIVETRAIL_API_KEY ?? ""}`,
    "Content-Type": "application/json",
  };
}

// ── Transactional Email ───────────────────────────────────────────────────
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.ACTIVETRAIL_API_KEY;
  const fromEmail = process.env.ACTIVETRAIL_FROM_EMAIL;
  if (!apiKey || !fromEmail || !to) return false;

  try {
    const res = await fetch(`${AT_BASE}/transactional/sendemail`, {
      method: "POST",
      headers: atHeaders(),
      body: JSON.stringify({
        to,
        subject,
        body: html,
        from_email: fromEmail,
        from_name: process.env.ACTIVETRAIL_FROM_NAME ?? "SWEBO",
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.error("[ActiveTrail] Email error:", res.status, err);
    }
    return res.ok;
  } catch (e) {
    console.error("[ActiveTrail] Email exception:", e);
    return false;
  }
}

// ── SMS ───────────────────────────────────────────────────────────────────
export async function sendSMS(phone: string, message: string): Promise<boolean> {
  const apiKey = process.env.ACTIVETRAIL_API_KEY;
  if (!apiKey || !phone) return false;

  // Normalise to Israeli international format (remove leading 0, add 972)
  const normalised = phone.replace(/\D/g, "").replace(/^0/, "972");

  try {
    const res = await fetch(`${AT_BASE}/sms/SendSMS`, {
      method: "POST",
      headers: atHeaders(),
      body: JSON.stringify({
        phones: [normalised],
        content: message,
        sender_id: process.env.ACTIVETRAIL_SMS_SENDER ?? "SWEBO",
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.error("[ActiveTrail] SMS error:", res.status, err);
    }
    return res.ok;
  } catch (e) {
    console.error("[ActiveTrail] SMS exception:", e);
    return false;
  }
}

// ── Add contact to ActiveTrail list ──────────────────────────────────────
export async function addContact(opts: {
  email?: string;
  phone?: string;
  firstName?: string;
}): Promise<boolean> {
  const apiKey = process.env.ACTIVETRAIL_API_KEY;
  const listId = process.env.ACTIVETRAIL_LIST_ID;
  if (!apiKey) return false;

  try {
    const contact: Record<string, unknown> = {
      email: opts.email ?? "",
      first_name: opts.firstName ?? "",
      is_suspended: false,
    };
    if (opts.phone) {
      const normalised = opts.phone.replace(/\D/g, "").replace(/^0/, "972");
      contact.phone1 = normalised;
    }
    if (listId) contact.group_id = Number(listId);

    const res = await fetch(`${AT_BASE}/contacts`, {
      method: "POST",
      headers: atHeaders(),
      body: JSON.stringify(contact),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.error("[ActiveTrail] AddContact error:", res.status, err);
    }
    return res.ok;
  } catch (e) {
    console.error("[ActiveTrail] AddContact exception:", e);
    return false;
  }
}

// ── notifyAdmin: SMS + email fallback ────────────────────────────────────
export async function notifyAdmin(subject: string, body: string): Promise<void> {
  const adminPhone = process.env.ADMIN_PHONE;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (adminPhone) {
    const ok = await sendSMS(adminPhone, `SWEBO – ${subject}\n${body}`);
    if (ok) return;
  }

  if (adminEmail) {
    await sendEmail(
      adminEmail,
      `SWEBO – ${subject}`,
      `<div dir="rtl" style="font-family:sans-serif;white-space:pre-wrap">${body}</div>`
    );
  }
}

// ── notifyCustomerEmail: transactional email ──────────────────────────────
export async function notifyCustomerEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  await sendEmail(to, subject, html);
}

// ── notifyOrderConfirmation: "thank you for your order" email ────────────
export async function notifyOrderConfirmation(order: {
  id: string;
  customerName: string;
  customerEmail: string;
  total: number;
  items: { nameHe: string; quantity: number; size: string; color?: string | null; price: number }[];
}): Promise<void> {
  if (!order.customerEmail) return;

  const itemsHtml = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #EDE8DF">${item.nameHe}${item.color ? ` (${item.color})` : ""} – מידה ${item.size}</td>
          <td style="padding:8px 0;border-bottom:1px solid #EDE8DF;text-align:left;white-space:nowrap">x${item.quantity}</td>
          <td style="padding:8px 0;border-bottom:1px solid #EDE8DF;text-align:left;white-space:nowrap">₪${(item.price * item.quantity).toFixed(2)}</td>
        </tr>`
    )
    .join("");

  await sendEmail(
    order.customerEmail,
    "תודה שקנית ב-SWEBO! ההזמנה שלך התקבלה",
    `<div dir="rtl" style="font-family:sans-serif;max-width:480px;margin:auto;color:#1A1A1A">
      <h2>תודה ${order.customerName}, ההזמנה שלך התקבלה!</h2>
      <p style="color:#6B6B6B">מספר הזמנה: <strong>${order.id}</strong></p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        ${itemsHtml}
      </table>
      <p style="font-size:1.1rem;font-weight:bold;text-align:left">סה״כ לתשלום: ₪${order.total.toFixed(2)}</p>
      <p style="color:#6B6B6B;font-size:0.9rem">נעדכן אותך כשההזמנה תצא למשלוח. תודה שבחרת ב-SWEBO!</p>
    </div>`
  );
}
