// GROW payment integration
// Fill in GROW_API_KEY, GROW_TERMINAL_NUMBER, GROW_PASSWORD in .env

export interface GrowPaymentRequest {
  amount: number;
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  successUrl: string;
  failureUrl: string;
  notifyUrl: string;
}

export interface GrowPaymentResponse {
  success: boolean;
  paymentUrl?: string;
  transactionId?: string;
  error?: string;
}

export async function createGrowPayment(
  req: GrowPaymentRequest
): Promise<GrowPaymentResponse> {
  const apiKey = process.env.GROW_API_KEY;
  const terminalNumber = process.env.GROW_TERMINAL_NUMBER;
  const password = process.env.GROW_PASSWORD;

  if (!apiKey || !terminalNumber || !password) {
    return { success: false, error: "GROW credentials not configured" };
  }

  try {
    // GROW API endpoint — replace with actual endpoint from your GROW dashboard
    const response = await fetch("https://api.grow.co.il/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        terminal: terminalNumber,
        password,
        amount: Math.round(req.amount * 100), // agorot
        currency: "ILS",
        order_id: req.orderId,
        customer_name: req.customerName,
        customer_email: req.customerEmail,
        customer_phone: req.customerPhone,
        success_url: req.successUrl,
        failure_url: req.failureUrl,
        notify_url: req.notifyUrl,
      }),
    });

    const data = await response.json();

    if (data.payment_url) {
      return {
        success: true,
        paymentUrl: data.payment_url,
        transactionId: data.transaction_id,
      };
    }

    return { success: false, error: data.message || "Payment creation failed" };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
