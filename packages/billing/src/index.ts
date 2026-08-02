/**
 * The single rule for "is this company on Pro".
 *
 * Web (client and server) and mobile all read the same Firestore document,
 * `companies/{companyId}/billing/subscription`, but each used to decide for
 * itself what the document meant — and they disagreed. This package owns the
 * decision so a company cannot be Pro on one client and free on another.
 *
 * Pure and dependency-free: safe to import from a browser bundle, a server
 * route, and a React Native app.
 */

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

/**
 * Statuses that still entitle a company to Pro.
 *
 * `past_due` is deliberately included: the card failed but the subscription has
 * not been cancelled, and locking someone out of their shop over a retryable
 * payment is worse than a few days of unpaid access. Matches the Stripe-side
 * check the billing functions use when they write the document.
 */
export const PRO_STATUSES: readonly BillingStatus[] = ['active', 'trialing', 'past_due'];

export function normalizeBillingPlan(value: unknown): BillingPlan {
  return BILLING_PLANS.includes(value as BillingPlan) ? (value as BillingPlan) : 'free';
}

export function normalizeBillingStatus(value: unknown): BillingStatus {
  return BILLING_STATUSES.includes(value as BillingStatus) ? (value as BillingStatus) : 'active';
}

/** The fields of the subscription document this decision depends on. */
export type ProResolutionInput = {
  plan?: unknown;
  status?: unknown;
  proActive?: unknown;
};

/**
 * Resolve Pro from a raw subscription document.
 *
 * `proActive` is authoritative when present — the server writes it from the
 * Stripe webhook, the App Store notification, or the internal trial engine.
 * The plan/status fallback only covers documents written before that flag
 * existed, and it counts `enterprise` as Pro: an enterprise company that is not
 * entitled to paid features makes no sense, and the web previously matched on
 * `plan === 'pro'` alone, which quietly denied them.
 */
export function resolveProActive(doc: ProResolutionInput | null | undefined): boolean {
  if (!doc) return false;
  if (typeof doc.proActive === 'boolean') return doc.proActive;

  const plan = normalizeBillingPlan(doc.plan);
  const status = normalizeBillingStatus(doc.status);
  return plan !== 'free' && PRO_STATUSES.includes(status);
}
