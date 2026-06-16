/**
 * HYPay (Hyp) payment gateway integration
 * Docs: https://hypay.docs.apiary.io/
 * Base: https://pay.hyp.co.il/p/
 *
 * Flow:
 *   1. Server calls APISign&What=SIGN (server-to-server) → gets signed query string
 *   2. Server builds redirect URL = BASE + signed query string → sends to frontend
 *   3. Frontend redirects customer to that URL
 *   4. Customer pays on HYPay's hosted page
 *   5. HYPay redirects customer back to SuccessUrl with transaction params
 *   6. Server calls APISign&What=VERIFY to confirm the transaction
 */

const BASE = "https://pay.hyp.co.il/p/";

function creds() {
  return {
    Masof: process.env.HYPAY_MASOF ?? "",
    KEY:   process.env.HYPAY_KEY   ?? "",
    PassP: process.env.HYPAY_PASS  ?? "",
  };
}

function parseHypayResponse(text: string): Record<string, string> {
  return Object.fromEntries(
    text.split("&").map((part) => {
      const idx = part.indexOf("=");
      return [part.slice(0, idx), decodeURIComponent(part.slice(idx + 1))];
    })
  );
}

/**
 * Server-side: calls HYPay's APISign to get a signed redirect URL.
 * Returns the URL to redirect the customer to, or null on failure.
 */
export async function createHypayRedirectUrl(params: {
  orderId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  successUrl: string;
  failureUrl: string;
}): Promise<string | null> {
  const { Masof, KEY, PassP } = creds();
  if (!Masof || !KEY || !PassP) return null;

  const nameParts = params.customerName.trim().split(" ");
  const ClientName  = nameParts[0] ?? params.customerName;
  const ClientLName = nameParts.slice(1).join(" ") || ClientName;

  const p = new URLSearchParams({
    action:     "APISign",
    What:       "SIGN",
    Sign:       "True",
    KEY,
    PassP,
    Masof,
    Amount:     String(Math.round(params.amount)),
    Order:      params.orderId,
    Info:       `הזמנה #${params.orderId.slice(-6).toUpperCase()}`,
    ClientName,
    ClientLName,
    email:      params.customerEmail,
    cell:       params.customerPhone,
    UserId:     "000000000",
    SuccessUrl: params.successUrl,
    ErrorUrl:   params.failureUrl,
    PageLang:   "HEB",
    Coin:       "1",
    UTF8:       "True",
    UTF8out:    "True",
    MoreData:   "True",
    sendemail:  "False",
    Tash:       "1",
  });

  try {
    const res = await fetch(`${BASE}?${p.toString()}`);
    const text = await res.text();

    if (text.trim().startsWith("<")) {
      console.error("[HYPay] HTML error from APISign:", text.slice(0, 300));
      return null;
    }

    const parsed = parseHypayResponse(text);
    if (parsed["CCode"] && parsed["CCode"] !== "0") {
      console.error("[HYPay] APISign error CCode:", parsed["CCode"], text);
      return null;
    }

    return `${BASE}?${text}`;
  } catch (err) {
    console.error("[HYPay] createHypayRedirectUrl error:", err);
    return null;
  }
}

/**
 * Verify a completed transaction with HYPay's APISign endpoint.
 * Returns true only if the transaction is genuinely approved.
 */
export async function verifyHypayTransaction(
  returnedParams: Record<string, string>
): Promise<boolean> {
  const { Masof, KEY, PassP } = creds();
  if (!Masof || !KEY || !PassP) return false;

  // CCode must be 0 (or 600/700/800 for edge cases) for a valid charge
  const ccode = returnedParams["CCode"] ?? "";
  if (!["0", "600", "700", "800"].includes(ccode)) return false;

  const p = new URLSearchParams({
    action: "APISign",
    What:   "VERIFY",
    KEY,
    PassP,
    Masof,
    ...returnedParams,
  });

  try {
    const res = await fetch(`${BASE}?${p.toString()}`);
    const text = await res.text();
    // Response contains CCode=0 if valid
    return text.includes("CCode=0");
  } catch {
    return false;
  }
}
