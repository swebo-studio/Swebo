/**
 * HYPay (Hyp) payment gateway integration
 * Docs: https://hypay.docs.apiary.io/
 * Base: https://pay.hyp.co.il/p/
 */

const BASE = "https://pay.hyp.co.il/p/";

function creds() {
  return {
    Masof: process.env.HYPAY_MASOF ?? "",
    KEY:   process.env.HYPAY_KEY   ?? "",
    PassP: process.env.HYPAY_PASS  ?? "",
  };
}

/**
 * Build the parameters for HYPay's hosted payment page.
 * The frontend must POST these as a form to BASE.
 */
export function createHypayParams(params: {
  orderId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  successUrl: string;
  failureUrl: string;
}): Record<string, string> | null {
  const { Masof, KEY, PassP } = creds();
  if (!Masof || !KEY || !PassP) return null;

  const nameParts = params.customerName.trim().split(" ");
  const ClientName  = nameParts[0] ?? params.customerName;
  const ClientLName = nameParts.slice(1).join(" ") || ClientName;

  return {
    action:     "pay",
    Masof,
    KEY,
    PassP,
    Amount:     String(Math.round(params.amount)),
    Info:       `הזמנה #${params.orderId.slice(-6).toUpperCase()}`,
    Order:      params.orderId,
    ClientName,
    ClientLName,
    email:      params.customerEmail,
    phone:      params.customerPhone,
    UserId:     "000000000",
    SuccessUrl: params.successUrl,
    ErrorUrl:   params.failureUrl,
    Coin:       "1",       // ILS
    Sign:       "False",
    UTF8:       "True",
    UTF8out:    "True",
    PageLang:   "HEB",
    MoreData:   "True",
    sendemail:  "False",   // we send our own confirmation email
    Tash:       "1",
  };
}

export const HYPAY_BASE = BASE;

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
