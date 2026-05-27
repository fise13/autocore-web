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
  provider: "internal" | "stripe";
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  priceId?: string;
  billingInterval?: BillingInterval | null;
  currentPeriodEnd?: Date | null;
  stripeUpdatedAt?: Date | null;
  updatedAt?: Date | null;
};

export function isProSubscription(subscription: CompanySubscription | null | undefined): boolean {
  return subscription?.proActive === true;
}
