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
 * Build the URL to redirect the customer to HYPay's hosted payment page.
 */
export function createHypayUrl(params: {
  orderId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  successUrl: string;
  failureUrl: string;
}): string | null {
  const { Masof, KEY, PassP } = creds();
  if (!Masof || !KEY || !PassP) return null;

  const p = new URLSearchParams({
    action:     "pay",
    Masof,
    KEY,
    PassP,
    Amount:     String(Math.round(params.amount)),
    Info:       `הזמנה #${params.orderId.slice(-6).toUpperCase()}`,
    Order:      params.orderId,
    ClientName: params.customerName,
    email:      params.customerEmail,
    phone:      params.customerPhone,
    UserId:     "000000000",
    SuccessUrl: params.successUrl,
    ErrorUrl:   params.failureUrl,
    Coin:       "1",        // ILS
    Sign:       "True",
    UTF8:       "True",
    UTF8out:    "True",
    PageLang:   "HEB",
    MoreData:   "True",
    sendemail:  "False",    // we send our own confirmation email
  });

  return `${BASE}?${p.toString()}`;
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
