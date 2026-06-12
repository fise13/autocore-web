type StripeCheckoutSession = {
  id: string;
  url: string | null;
  payment_status?: string;
  customer?: string | { id?: string } | null;
  subscription?: string | { id?: string } | null;
  customer_email?: string | null;
  customer_details?: { email?: string | null } | null;
  metadata?: Record<string, string>;
};

export type BillingInterval = "monthly" | "yearly";

function resolvePriceId(interval: BillingInterval): string {
  const monthly =
    process.env.STRIPE_PRICE_PRO_MONTHLY ||
    process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY ||
    "price_1TbiZUHo5bmy0A9LC86I6wJJ";
  const yearly =
    process.env.STRIPE_PRICE_PRO_YEARLY ||
    process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY ||
    "price_1TbiarHo5bmy0A9LD3SafymR";
  return interval === "yearly" ? yearly : monthly;
}

async function stripeRequest<T>(
  secretKey: string,
  path: string,
  body?: URLSearchParams,
): Promise<T> {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const payload = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Stripe request failed");
  }
  return payload;
}

export async function createMarketingStripeCheckout(params: {
  secretKey: string;
  interval: BillingInterval;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string; sessionId: string }> {
  const body = new URLSearchParams({
    mode: "subscription",
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    "line_items[0][price]": resolvePriceId(params.interval),
    "line_items[0][quantity]": "1",
    "metadata[flow]": "marketing_pro",
    "metadata[interval]": params.interval,
    "subscription_data[metadata][flow]": "marketing_pro",
    "subscription_data[metadata][interval]": params.interval,
    allow_promotion_codes: "true",
  });

  const session = await stripeRequest<StripeCheckoutSession>(params.secretKey, "checkout/sessions", body);
  const url = session.url?.trim();
  if (!url) {
    throw new Error("Stripe Checkout не вернул ссылку");
  }
  return { url, sessionId: session.id };
}

export async function retrieveStripeCheckoutSession(
  secretKey: string,
  sessionId: string,
): Promise<StripeCheckoutSession> {
  const response = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
    {
      headers: { Authorization: `Bearer ${secretKey}` },
    },
  );
  const payload = (await response.json()) as StripeCheckoutSession & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Не удалось прочитать сессию Stripe");
  }
  return payload;
}

export function stripeObjectId(value: string | { id?: string } | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.id?.trim() || null;
}

export function checkoutSessionEmail(session: StripeCheckoutSession): string | null {
  return (
    session.customer_email?.trim().toLowerCase() ||
    session.customer_details?.email?.trim().toLowerCase() ||
    null
  );
}
