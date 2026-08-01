export const BILLING_PLANS = ['free', 'pro', 'enterprise'] as const;
export type BillingPlan = (typeof BILLING_PLANS)[number];

export const BILLING_STATUSES = [
  'active',
  'trialing',
  'past_due',
  'canceled',
  'unpaid',
  'incomplete',
] as const;
export type BillingStatus = (typeof BILLING_STATUSES)[number];

export type BillingInterval = 'monthly' | 'yearly';

export type BillingProvider = 'internal' | 'stripe' | 'apple' | 'google';

export type CompanySubscription = {
  plan: BillingPlan;
  status: BillingStatus;
  /**
   * Authoritative entitlement flag, written by the server (Stripe webhook,
   * App Store Server Notification, or the internal trial engine). Kept as the
   * primary signal so older web/desktop clients keep working unchanged.
   */
  proActive: boolean;
  provider: BillingProvider;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  priceId?: string;
  billingInterval?: BillingInterval | null;
  currentPeriodEnd?: Date | null;
  stripeUpdatedAt?: Date | null;
  updatedAt?: Date | null;

  /** Apple / StoreKit fields — present only when `provider === 'apple'`. */
  appleOriginalTransactionId?: string | null;
  appleProductId?: string | null;
  appleEnvironment?: 'Sandbox' | 'Production' | null;
  /** False after the user cancels but before the paid period ends. */
  willAutoRenew?: boolean | null;
  /** Billing-retry window: still entitled, payment is failing. */
  gracePeriodEnd?: Date | null;
  /** The company has already consumed its one internal (non-Apple) trial. */
  trialUsed?: boolean;
  revokedAt?: Date | null;
};

export function isProSubscription(subscription: CompanySubscription | null | undefined): boolean {
  return subscription?.proActive === true;
}

/**
 * Tolerant plan reader. An older document has no `plan: 'enterprise'` and a
 * newer one may carry a plan this build has never heard of — both degrade to a
 * known value rather than throwing. Cross-client schema safety.
 */
export function normalizeBillingPlan(value: unknown): BillingPlan {
  return BILLING_PLANS.includes(value as BillingPlan) ? (value as BillingPlan) : 'free';
}

export function normalizeBillingStatus(value: unknown): BillingStatus {
  return BILLING_STATUSES.includes(value as BillingStatus) ? (value as BillingStatus) : 'active';
}

export function normalizeBillingProvider(value: unknown): BillingProvider {
  return value === 'stripe' || value === 'apple' || value === 'google' || value === 'internal'
    ? value
    : 'internal';
}
