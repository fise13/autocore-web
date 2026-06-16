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

export type StripeSubscription = {
  id: string;
  status: string;
  customer: string | { id?: string };
  items?: {
    data?: Array<{
      price?: { id?: string };
      current_period_end?: number;
    }>;
  };
  current_period_end?: number;
  metadata?: Record<string, string>;
};

type StripeCustomer = {
  id: string;
};

type StripePortalSession = {
  url: string | null;
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

export function billingIntervalFromPriceId(priceId: string | undefined): BillingInterval | null {
  if (!priceId) return null;
  if (priceId === resolvePriceId("yearly")) return "yearly";
  if (priceId === resolvePriceId("monthly")) return "monthly";
  return null;
}

async function stripeRequest<T>(
  secretKey: string,
  path: string,
  body?: URLSearchParams,
  method: "POST" | "GET" = "POST",
): Promise<T> {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: method === "POST" ? body : undefined,
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

export async function createCompanyStripeCheckout(params: {
  secretKey: string;
  companyId: string;
  priceId: string;
  customerId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string; sessionId: string }> {
  const body = new URLSearchParams({
    mode: "subscription",
    customer: params.customerId,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    "line_items[0][price]": params.priceId,
    "line_items[0][quantity]": "1",
    "metadata[flow]": "in_app_pro",
    "metadata[companyId]": params.companyId,
    "subscription_data[metadata][flow]": "in_app_pro",
    "subscription_data[metadata][companyId]": params.companyId,
    allow_promotion_codes: "true",
  });

  const session = await stripeRequest<StripeCheckoutSession>(params.secretKey, "checkout/sessions", body);
  const url = session.url?.trim();
  if (!url) {
    throw new Error("Stripe Checkout не вернул ссылку");
  }
  return { url, sessionId: session.id };
}

export async function createStripeCustomer(params: {
  secretKey: string;
  email?: string;
  name?: string;
  companyId: string;
}): Promise<string> {
  const body = new URLSearchParams({
    "metadata[companyId]": params.companyId,
  });
  if (params.email) body.set("email", params.email);
  if (params.name) body.set("name", params.name);

  const customer = await stripeRequest<StripeCustomer>(params.secretKey, "customers", body);
  return customer.id;
}

export async function createStripeBillingPortal(params: {
  secretKey: string;
  customerId: string;
  returnUrl: string;
}): Promise<string> {
  const body = new URLSearchParams({
    customer: params.customerId,
    return_url: params.returnUrl,
  });

  const session = await stripeRequest<StripePortalSession>(params.secretKey, "billing_portal/sessions", body);
  const url = session.url?.trim();
  if (!url) {
    throw new Error("Stripe Portal не вернул ссылку");
  }
  return url;
}

export async function retrieveStripeCheckoutSession(
  secretKey: string,
  sessionId: string,
): Promise<StripeCheckoutSession> {
  const payload = await stripeRequest<StripeCheckoutSession>(
    secretKey,
    `checkout/sessions/${encodeURIComponent(sessionId)}`,
    undefined,
    "GET",
  );
  return payload;
}

export async function retrieveStripeSubscription(
  secretKey: string,
  subscriptionId: string,
): Promise<StripeSubscription> {
  return stripeRequest<StripeSubscription>(
    secretKey,
    `subscriptions/${encodeURIComponent(subscriptionId)}`,
    undefined,
    "GET",
  );
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

export function isProStripeStatus(status: string | undefined): boolean {
  return status === "active" || status === "trialing" || status === "past_due";
}

export function subscriptionPeriodEnd(subscription: StripeSubscription): number | null {
  const fromItem = subscription.items?.data?.[0]?.current_period_end;
  if (typeof fromItem === "number") return fromItem;
  if (typeof subscription.current_period_end === "number") return subscription.current_period_end;
  return null;
}
