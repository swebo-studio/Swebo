import { prisma } from "./db";
import { SMS_TEMPLATES, STAGE_SMS_TEMPLATE, SMS_LOW_BALANCE_THRESHOLD, stageSmsTemplateKey, renderSmsTemplate, smsCost } from "./smsTemplates";

export { renderSmsTemplate };

/** Fetch a (possibly admin-customized) SMS template, falling back to its default. */
export async function getSmsTemplate(key: keyof typeof SMS_TEMPLATES): Promise<string> {
  const row = await prisma.siteConfig.findUnique({ where: { key } });
  return row?.value || SMS_TEMPLATES[key].default;
}

const AT_BASE = "https://webapi.mymarketing.co.il/api";

function atHeaders() {
  return {
    "Authorization": process.env.ACTIVETRAIL_API_KEY ?? "",
    "Content-Type": "application/json",
  };
}


// ── SMS ───────────────────────────────────────────────────────────────────
export async function sendSMS(phone: string, message: string): Promise<boolean> {
  const apiKey = process.env.ACTIVETRAIL_API_KEY;
  // Returning quietly here once cost hours of looking in the wrong place: the
  // request succeeded, the code reached the database, and nothing anywhere
  // said the message had not been sent.
  if (!apiKey) {
    console.error("[ActiveTrail] ACTIVETRAIL_API_KEY is empty or unset — no SMS sent");
    return false;
  }
  if (!phone) {
    console.error("[ActiveTrail] no phone number given — no SMS sent");
    return false;
  }

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

// ── Add contact to ActiveTrail ────────────────────────────────────────────
export async function addContact(opts: {
  email?: string;
  phone?: string;
  firstName?: string;
}): Promise<boolean> {
  const apiKey = process.env.ACTIVETRAIL_API_KEY;
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

// ── SMS credit balance ────────────────────────────────────────────────────
export interface SmsBalance {
  credits: number;
  /** Share of the current package still left, 0–100. */
  percent: number;
  /** ActiveTrail's own low-balance flag — "None" when all is well. */
  alertType: string;
}

export async function getSmsBalance(): Promise<SmsBalance | null> {
  if (!process.env.ACTIVETRAIL_API_KEY) return null;
  try {
    const res = await fetch(`${AT_BASE}/account/balance`, {
      headers: atHeaders(),
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("[ActiveTrail] balance error:", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = await res.json();
    if (typeof data?.sms?.credits !== "number") return null;
    return { credits: data.sms.credits, percent: data.sms.percent ?? 0, alertType: data.sms.alert_type ?? "None" };
  } catch (e) {
    console.error("[ActiveTrail] balance exception:", e);
    return null;
  }
}

// Row exists while an alert is outstanding — its unique key is what stops two
// orders paid at the same moment from both texting the admins.
const LOW_BALANCE_ALERT_KEY = "sms.lowBalanceAlertedAt";

/**
 * Texts every admin once when credits fall to SMS_LOW_BALANCE_THRESHOLD, then
 * stays quiet until a refill lifts the balance back above it. Run after each
 * paid order (the biggest spender) and daily by cron as a backstop.
 */
export async function checkSmsBalance(): Promise<void> {
  const balance = await getSmsBalance();
  if (!balance) return;

  if (balance.credits > SMS_LOW_BALANCE_THRESHOLD) {
    await prisma.siteConfig.deleteMany({ where: { key: LOW_BALANCE_ALERT_KEY } });
    return;
  }

  try {
    await prisma.siteConfig.create({ data: { key: LOW_BALANCE_ALERT_KEY, value: new Date().toISOString() } });
  } catch {
    return; // already alerted for this dip
  }

  const rows = await prisma.adminPhone.findMany({ select: { phone: true } });
  const phones = new Set(
    [...rows.map((r) => r.phone), process.env.ADMIN_PHONE ?? ""]
      .map((p) => p.replace(/\D/g, "").replace(/^972/, "0"))
      .filter(Boolean)
  );
  const message = `SWEBO: נותרו רק ${balance.credits} קרדיטי SMS. לרכישה: app.activetrail.com`;
  for (const phone of phones) await sendSMS(phone, message);
  console.warn(`[ActiveTrail] low SMS balance (${balance.credits}) — alerted ${phones.size} admin(s)`);
}

// ── notifyAdmin: SMS ─────────────────────────────────────────────────────
function adminSmsText(subject: string, body: string): string {
  return `SWEBO – ${subject}\n${body}`;
}

export async function notifyAdmin(subject: string, body: string): Promise<void> {
  const adminPhone = process.env.ADMIN_PHONE;
  if (adminPhone) await sendSMS(adminPhone, adminSmsText(subject, body));
}

interface OrderForAdminSms {
  id: string;
  customerName: string;
  customerPhone: string;
  total: number;
  address: string;
  floor?: string | null;
  apartment?: string | null;
  city: string;
  deliveryMode?: string | null;
  pudoPointName?: string | null;
  items: { quantity: number; size: string; color?: string | null; price: number; product: { nameHe: string } }[];
}

/** Body of the "new order" SMS the admin gets once an order is paid. */
export function newOrderAdminMessage(order: OrderForAdminSms): string {
  const itemLines = order.items
    .map((i) => `• ${i.product.nameHe} × ${i.quantity} (${i.color ?? "ללא צבע"} / מידה ${i.size}) ₪${i.price * i.quantity}`)
    .join("\n");
  const deliveryLine =
    order.deliveryMode === "self" ? "איסוף עצמי" :
    order.deliveryMode === "epost" ? `נקודת איסוף: ${order.pudoPointName ?? ""} (${order.city})` :
    `משלוח לכתובת: ${order.address}${order.floor ? `, קומה ${order.floor}` : ""}${order.apartment ? `, דירה ${order.apartment}` : ""}, ${order.city}`;
  return `הזמנה #${order.id.slice(-6).toUpperCase()}\nלקוח: ${order.customerName}\nטל: ${order.customerPhone}\nסה"כ: ₪${order.total}\n${deliveryLine}\n\n${itemLines}`;
}

// ── notifyOrderConfirmation: "thank you for your order" SMS ──────────────
interface OrderForConfirmationSms {
  id: string;
  customerName: string;
  total: number;
  items: { nameHe: string; quantity: number; size: string }[];
}

function orderConfirmationVars(order: OrderForConfirmationSms): Record<string, string> {
  return {
    name: order.customerName,
    orderId: order.id.slice(-6).toUpperCase(),
    items: order.items.map((item) => `${item.nameHe} (${item.size}) x${item.quantity}`).join(", "),
    total: order.total.toFixed(2),
  };
}

export async function notifyOrderConfirmation(order: OrderForConfirmationSms & {
  customerPhone: string;
  items: { nameHe: string; quantity: number; size: string; color?: string | null; price: number }[];
}): Promise<void> {
  if (!order.customerPhone) return;

  const template = await getSmsTemplate("sms.orderConfirmation");
  await sendSMS(order.customerPhone, renderSmsTemplate(template, orderConfirmationVars(order)));
}

// ── What one order costs in SMS credits ──────────────────────────────────
export interface OrderSmsEstimate {
  /** Average credits per order: customer + admin. */
  perOrder: number;
  /** Order confirmation plus the three stage updates. */
  customer: number;
  /** The "new order" SMS to ADMIN_PHONE (0 when that is unset). */
  admin: number;
  /** How many recent paid orders the average is taken over. */
  sampleSize: number;
}

/**
 * Replays recent paid orders through the saved templates to see what an order
 * really costs — the item list and the admin's address block vary a lot, so a
 * made-up sample would be off. Assumes every order goes through all stages.
 */
export async function estimateOrderSmsCredits(sample = 50): Promise<OrderSmsEstimate | null> {
  const orders = await prisma.order.findMany({
    where: { status: "paid" },
    orderBy: { createdAt: "desc" },
    take: sample,
    include: { items: { include: { product: { select: { nameHe: true } } } } },
  });
  if (orders.length === 0) return null;

  const rows = await prisma.siteConfig.findMany({ where: { key: { in: Object.keys(SMS_TEMPLATES) } } });
  const template = (key: string) => (rows.find((r) => r.key === key)?.value || SMS_TEMPLATES[key].default).trim();
  const credits = (text: string) => smsCost(text).credits;
  const adminEnabled = Boolean(process.env.ADMIN_PHONE);

  let customer = 0;
  let admin = 0;
  for (const order of orders) {
    const items = order.items.map((i) => ({ ...i, nameHe: i.product.nameHe }));
    customer += credits(renderSmsTemplate(template("sms.orderConfirmation"), orderConfirmationVars({ ...order, items })));
    for (const stage of Object.keys(STAGE_SMS_TEMPLATE)) {
      const key = stageSmsTemplateKey(stage, order.deliveryMode)!;
      customer += credits(renderSmsTemplate(template(key), stageSmsVars(order)));
    }
    if (adminEnabled) admin += credits(adminSmsText("הזמנה חדשה", newOrderAdminMessage(order)));
  }

  const round = (n: number) => Math.round((n / orders.length) * 10) / 10;
  return { perOrder: round(customer + admin), customer: round(customer), admin: round(admin), sampleSize: orders.length };
}

// ── notifyOrderStage: "your order moved to X" SMS ────────────────────────
/**
 * Text the buyer when the admin advances the order to a new fulfilment stage.
 * Each delivery mode has its own wording — home delivery, pickup point, and
 * self-pickup all describe "shipped" differently. No-ops for stages without a
 * template (e.g. "received" — already covered by the order-confirmation SMS)
 * and when the admin has blanked the template.
 */
export async function notifyOrderStage(
  order: {
    id: string;
    customerName: string;
    customerPhone: string;
    deliveryMode?: string | null;
    shipmentNumber?: string | null;
    pudoPointName?: string | null;
  },
  stage: string
): Promise<void> {
  if (!order.customerPhone) return;

  const templateKey = stageSmsTemplateKey(stage, order.deliveryMode);
  if (!templateKey) return;

  const template = (await getSmsTemplate(templateKey)).trim();
  if (!template) return;

  await sendSMS(order.customerPhone, renderSmsTemplate(template, stageSmsVars(order)));
}

function stageSmsVars(order: {
  id: string;
  customerName: string;
  shipmentNumber?: string | null;
  pudoPointName?: string | null;
}): Record<string, string> {
  return {
    name: order.customerName,
    orderId: order.id.slice(-6).toUpperCase(),
    shipment: order.shipmentNumber ?? "",
    pudo: order.pudoPointName ?? "",
  };
}
