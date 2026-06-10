const AT_BASE = "https://webapi.mymarketing.co.il/api";

function atHeaders() {
  return {
    "Authorization": process.env.ACTIVETRAIL_API_KEY ?? "",
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
    const res = await fetch(`${AT_BASE}/smscampaign/OperationalMessage`, {
      method: "POST",
      headers: atHeaders(),
      body: JSON.stringify({
        details: {
          name: `SWEBO ${new Date().toISOString()}`,
          from_name: process.env.ACTIVETRAIL_SMS_SENDER ?? "SWEBO",
          content: message,
          can_unsubscribe: false,
        },
        scheduling: { send_now: true },
        mobiles: [{ phone_number: normalised }],
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

// ── notifyOrderConfirmation: "thank you for your order" SMS ──────────────
export async function notifyOrderConfirmation(order: {
  id: string;
  customerName: string;
  customerPhone: string;
  total: number;
  items: { nameHe: string; quantity: number; size: string; color?: string | null; price: number }[];
}): Promise<void> {
  if (!order.customerPhone) return;

  const itemsSummary = order.items
    .map((item) => `${item.nameHe} (${item.size}) x${item.quantity}`)
    .join(", ");

  await sendSMS(
    order.customerPhone,
    `תודה ${order.customerName}! ההזמנה שלך ב-SWEBO התקבלה (#${order.id.slice(-6)}): ${itemsSummary}. סה"כ: ₪${order.total.toFixed(2)}. נעדכן כשתצא למשלוח.`
  );
}
