/**
 * Entitlement resolution — L3, pure.
 *
 * No I/O, no React, no native calls: given the three possible sources it
 * returns one `Entitlement`. Keeping it pure is what makes the precedence and
 * grace-period rules testable without a store connection or an emulator.
 */
import type { CompanySubscription } from '@/types/billing';
import { dateMs } from '@/lib/firestore-timestamp';

import { highestPlan, planForSku, PLANS } from './catalog';
import { isCacheTrustworthy, type CachedEntitlement } from './entitlement-cache';
import type {
  Entitlement,
  EntitlementProvider,
  EntitlementSource,
  PlanId,
  SubscriptionTier,
} from './types';

/** Minimal shape of what StoreKit reports, decoupled from the SDK type. */
export type LocalActiveSubscription = {
  productId: string;
  isActive: boolean;
  expirationDateMs: number | null;
  willAutoRenew: boolean;
};

export type ResolverInput = {
  companyId: string | null;
  /**
   * Development override. `undefined` in production and whenever the dev panel
   * is off, so the real precedence chain is untouched.
   */
  devOverride?: CompanySubscription | null | undefined;
  /** Live Firestore value. `undefined` = not loaded yet; `null` = no document. */
  remote: CompanySubscription | null | undefined;
  cached: CachedEntitlement | undefined;
  local: LocalActiveSubscription[];
  now?: number;
};

export const FREE_ENTITLEMENT: Entitlement = {
  companyId: null,
  tier: 'free',
  planId: 'free',
  status: 'active',
  isActive: false,
  isTrial: false,
  trialEndsAt: null,
  trialUsed: false,
  renewsAt: null,
  willAutoRenew: false,
  inGracePeriod: false,
  provider: 'internal',
  managedExternally: false,
  source: 'unknown',
};

function tierForPlanId(planId: PlanId): SubscriptionTier {
  return PLANS[planId].tier;
}

/**
 * Derive the plan from the subscription document.
 *
 * `plan: 'pro'` alone does not say monthly or yearly, so the Apple product id
 * and then the billing interval are consulted before falling back to monthly.
 */
function planIdFromSubscription(subscription: CompanySubscription): PlanId {
  if (subscription.plan === 'enterprise') return 'enterprise';
  if (subscription.plan === 'free') return 'free';

  if (subscription.appleProductId) {
    const matched = planForSku(subscription.appleProductId);
    if (matched) return matched.id;
  }

  return subscription.billingInterval === 'yearly' ? 'pro_yearly' : 'pro_monthly';
}

/**
 * A subscription bought outside the App Store must not show purchase CTAs on
 * iOS — buying again would bill the company twice.
 */
function isManagedExternally(provider: EntitlementProvider, tier: SubscriptionTier): boolean {
  if (tier === 'enterprise') return true;
  return provider === 'stripe';
}

function fromSubscription(
  subscription: CompanySubscription,
  companyId: string | null,
  source: EntitlementSource,
  now: number,
): Entitlement {
  const planId = planIdFromSubscription(subscription);
  const tier = tierForPlanId(planId);
  const isTrial = subscription.status === 'trialing';

  const graceEndMs = dateMs(subscription.gracePeriodEnd, Number.NaN);
  const graceEnd = Number.isFinite(graceEndMs) ? graceEndMs : null;
  const inGracePeriod =
    subscription.status === 'past_due' || (graceEnd !== null && graceEnd > now);

  return {
    companyId,
    tier: subscription.proActive ? tier : 'free',
    planId: subscription.proActive ? planId : 'free',
    status: subscription.status,
    isActive: subscription.proActive,
    isTrial: isTrial && subscription.proActive,
    trialEndsAt: isTrial ? (subscription.currentPeriodEnd ?? null) : null,
    trialUsed: subscription.trialUsed === true,
    renewsAt: subscription.currentPeriodEnd ?? null,
    // Absent on legacy documents; an active subscription is assumed renewing.
    willAutoRenew: subscription.willAutoRenew ?? subscription.proActive,
    inGracePeriod: inGracePeriod && subscription.proActive,
    provider: subscription.provider,
    managedExternally: isManagedExternally(subscription.provider, tier),
    source,
  };
}

/**
 * Last-resort source: StoreKit itself says this device holds an active
 * subscription, but our server has not confirmed it.
 *
 * Deliberately never cached and never used while a remote or fresh cached value
 * exists. It exists so a paying user is not locked out offline; it grants no
 * server-side capability, since paid APIs remain gated by `assertCompanyPro`.
 */
function fromLocal(
  local: LocalActiveSubscription[],
  companyId: string | null,
  now: number,
): Entitlement | null {
  const active = local.filter(
    (item) => item.isActive && (item.expirationDateMs === null || item.expirationDateMs > now),
  );
  if (active.length === 0) return null;

  const planIds = active
    .map((item) => planForSku(item.productId)?.id)
    .filter((id): id is PlanId => id !== undefined);
  if (planIds.length === 0) return null;

  const planId = highestPlan(planIds);
  const chosen = active.find((item) => planForSku(item.productId)?.id === planId);
  const expiry = chosen?.expirationDateMs ?? null;

  return {
    companyId,
    tier: tierForPlanId(planId),
    planId,
    status: 'active',
    isActive: true,
    isTrial: false,
    trialEndsAt: null,
    // Unknowable offline; Apple intro eligibility is StoreKit's, not this flag.
    trialUsed: true,
    renewsAt: expiry ? new Date(expiry) : null,
    willAutoRenew: chosen?.willAutoRenew ?? true,
    inGracePeriod: false,
    provider: 'apple',
    managedExternally: false,
    source: 'local_unverified',
  };
}

/**
 * Merge the three sources in strict priority order:
 * authoritative → cached (within TTL) → local StoreKit → free.
 */
export function resolveEntitlement(input: ResolverInput): Entitlement {
  const now = input.now ?? Date.now();
  const { companyId, remote, cached, local, devOverride } = input;

  // Highest priority by design: the point of the simulator is to override
  // whatever the server and the store actually say.
  if (devOverride !== undefined) {
    if (devOverride === null) {
      return { ...FREE_ENTITLEMENT, companyId, source: 'dev' };
    }
    return { ...fromSubscription(devOverride, companyId, 'dev', now), source: 'dev' };
  }

  if (remote !== undefined) {
    if (remote === null) {
      return { ...FREE_ENTITLEMENT, companyId, source: 'authoritative' };
    }
    return fromSubscription(remote, companyId, 'authoritative', now);
  }

  if (cached && isCacheTrustworthy(cached, now)) {
    if (cached.subscription === null) {
      return { ...FREE_ENTITLEMENT, companyId, source: 'cached' };
    }
    return fromSubscription(cached.subscription, companyId, 'cached', now);
  }

  const localEntitlement = fromLocal(local, companyId, now);
  if (localEntitlement) return localEntitlement;

  return { ...FREE_ENTITLEMENT, companyId };
}

/** Structural equality — lets the registry skip no-op notifications. */
export function entitlementsEqual(a: Entitlement, b: Entitlement): boolean {
  return (
    a.companyId === b.companyId &&
    a.tier === b.tier &&
    a.planId === b.planId &&
    a.status === b.status &&
    a.isActive === b.isActive &&
    a.isTrial === b.isTrial &&
    a.trialUsed === b.trialUsed &&
    a.willAutoRenew === b.willAutoRenew &&
    a.inGracePeriod === b.inGracePeriod &&
    a.provider === b.provider &&
    a.managedExternally === b.managedExternally &&
    a.source === b.source &&
    (a.trialEndsAt == null ? null : dateMs(a.trialEndsAt)) ===
      (b.trialEndsAt == null ? null : dateMs(b.trialEndsAt)) &&
    (a.renewsAt == null ? null : dateMs(a.renewsAt)) ===
      (b.renewsAt == null ? null : dateMs(b.renewsAt))
  );
}
