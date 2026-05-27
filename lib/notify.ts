import nodemailer from "nodemailer";

// ── WhatsApp via CallMeBot (free – admin must activate once) ──────────────
export async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  const apiKey = process.env.CALLMEBOT_APIKEY;
  if (!phone || !apiKey) return false;
  try {
    const encoded = encodeURIComponent(message);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encoded}&apikey=${apiKey}`;
    const res = await fetch(url, { method: "GET", signal: AbortSignal.timeout(8000) });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Email via SMTP ────────────────────────────────────────────────────────
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!to || !from) return false;
  const transporter = createTransporter();
  if (!transporter) return false;
  try {
    await transporter.sendMail({ from, to, subject, html });
    return true;
  } catch {
    return false;
  }
}

// ── Combined: WhatsApp first, fallback to email ───────────────────────────
export async function notifyAdmin(subject: string, body: string): Promise<void> {
  const adminPhone = process.env.ADMIN_WHATSAPP;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (adminPhone) {
    const ok = await sendWhatsApp(adminPhone, `SWEBO הזמנה חדשה\n${body}`);
    if (ok) return;
  }

  if (adminEmail) {
    await sendEmail(adminEmail, `SWEBO – ${subject}`, `<pre style="direction:rtl">${body}</pre>`);
  }
}

export async function notifyCustomerEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  await sendEmail(to, subject, html);
}
