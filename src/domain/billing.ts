export const BILLING_PLANS = ["free", "pro"] as const;
export type BillingPlan = (typeof BILLING_PLANS)[number];

export const BILLING_STATUSES = [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "unpaid",
  "incomplete",
] as const;
export type BillingStatus = (typeof BILLING_STATUSES)[number];

export type BillingInterval = "monthly" | "yearly";

export type CompanySubscription = {
  plan: BillingPlan;
  status: BillingStatus;
  /** Authoritative Pro flag synced from Stripe webhook / sync. */
  proActive: boolean;
  /**
   * Who owns the subscription. `apple` is written by the App Store paths and
   * was missing here, so every `provider` branch on the web was typed as if an
   * in-app purchase could not exist — the value arrived at runtime anyway and
   * fell through to whatever the last `else` happened to be.
   */
  provider: "internal" | "stripe" | "paddle" | "apple";
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  paddleCustomerId?: string;
  paddleSubscriptionId?: string;
  priceId?: string;
  billingInterval?: BillingInterval | null;
  currentPeriodEnd?: Date | null;
  stripeUpdatedAt?: Date | null;
  updatedAt?: Date | null;
};

export function isProSubscription(subscription: CompanySubscription | null | undefined): boolean {
  return subscription?.proActive === true;
}
