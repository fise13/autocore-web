/**
 * Offline entitlement cache — L2c.
 *
 * Absorbs the former `lib/billing/subscription-cache.ts`, adding a bounded
 * trust window. A cached entitlement is honoured while the paid period (plus a
 * short grace) has not elapsed **and** the cache itself is not stale. Past
 * either bound the app degrades to free rather than granting paid features
 * forever to a device that never reconnects.
 */
import { clearNamespace, getJson, setJson } from '@/lib/storage/kv';
import { ensureAsyncStorageMigrated } from '@/lib/storage/migrate-async-storage';
import type {
  BillingInterval,
  BillingPlan,
  BillingProvider,
  BillingStatus,
  CompanySubscription,
} from '@/types/billing';

const STORAGE_PREFIX = 'autocore-mobile:subscription:v2:';

/** Bumping this discards every cached record rather than migrating a guess. */
const SCHEMA_VERSION = 2;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Keep entitlement past `currentPeriodEnd` to absorb renewal propagation lag. */
export const GRACE_DAYS = 3;

/** Hard ceiling on how long an offline device stays entitled. */
export const OFFLINE_MAX_DAYS = 14;

type SerializedSubscription = {
  plan: BillingPlan;
  status: BillingStatus;
  proActive: boolean;
  provider: BillingProvider;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  priceId?: string;
  billingInterval?: BillingInterval | null;
  currentPeriodEnd?: string | null;
  stripeUpdatedAt?: string | null;
  updatedAt?: string | null;
  appleOriginalTransactionId?: string | null;
  appleProductId?: string | null;
  appleEnvironment?: 'Sandbox' | 'Production' | null;
  willAutoRenew?: boolean | null;
  trialUsed?: boolean;
  gracePeriodEnd?: string | null;
  revokedAt?: string | null;
};

type CachedSubscription = {
  schemaVersion: number;
  companyId: string;
  subscription: SerializedSubscription | null;
  cachedAt: number;
};

function iso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function date(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null;
}

function serialize(subscription: CompanySubscription | null): SerializedSubscription | null {
  if (!subscription) return null;
  return {
    plan: subscription.plan,
    status: subscription.status,
    proActive: subscription.proActive,
    provider: subscription.provider,
    stripeCustomerId: subscription.stripeCustomerId,
    stripeSubscriptionId: subscription.stripeSubscriptionId,
    priceId: subscription.priceId,
    billingInterval: subscription.billingInterval ?? null,
    currentPeriodEnd: iso(subscription.currentPeriodEnd),
    stripeUpdatedAt: iso(subscription.stripeUpdatedAt),
    updatedAt: iso(subscription.updatedAt),
    appleOriginalTransactionId: subscription.appleOriginalTransactionId ?? null,
    appleProductId: subscription.appleProductId ?? null,
    appleEnvironment: subscription.appleEnvironment ?? null,
    willAutoRenew: subscription.willAutoRenew ?? null,
    trialUsed: subscription.trialUsed === true,
    gracePeriodEnd: iso(subscription.gracePeriodEnd),
    revokedAt: iso(subscription.revokedAt),
  };
}

function deserialize(subscription: SerializedSubscription | null): CompanySubscription | null {
  if (!subscription) return null;
  return {
    plan: subscription.plan,
    status: subscription.status,
    proActive: subscription.proActive,
    provider: subscription.provider,
    stripeCustomerId: subscription.stripeCustomerId,
    stripeSubscriptionId: subscription.stripeSubscriptionId,
    priceId: subscription.priceId,
    billingInterval: subscription.billingInterval ?? null,
    currentPeriodEnd: date(subscription.currentPeriodEnd),
    stripeUpdatedAt: date(subscription.stripeUpdatedAt),
    updatedAt: date(subscription.updatedAt),
    appleOriginalTransactionId: subscription.appleOriginalTransactionId ?? null,
    appleProductId: subscription.appleProductId ?? null,
    appleEnvironment: subscription.appleEnvironment ?? null,
    willAutoRenew: subscription.willAutoRenew ?? null,
    trialUsed: subscription.trialUsed === true,
    gracePeriodEnd: date(subscription.gracePeriodEnd),
    revokedAt: date(subscription.revokedAt),
  };
}

export type CachedEntitlement = {
  subscription: CompanySubscription | null;
  cachedAt: number;
};

/**
 * Read the cached record. `undefined` means "nothing cached" — distinct from
 * `{ subscription: null }`, which means "the server told us there is no
 * subscription", a fact worth caching.
 */
export function readEntitlementCacheSync(companyId: string): CachedEntitlement | undefined {
  const parsed = getJson<CachedSubscription>(`${STORAGE_PREFIX}${companyId}`);
  if (!parsed) return undefined;
  if (parsed.schemaVersion !== SCHEMA_VERSION) return undefined;
  if (parsed.companyId !== companyId) return undefined;

  return {
    subscription: deserialize(parsed.subscription),
    cachedAt: parsed.cachedAt,
  };
}

export async function readEntitlementCache(
  companyId: string,
): Promise<CachedEntitlement | undefined> {
  await ensureAsyncStorageMigrated();
  return readEntitlementCacheSync(companyId);
}

export function writeEntitlementCache(
  companyId: string,
  subscription: CompanySubscription | null,
  now = Date.now(),
): void {
  try {
    const payload: CachedSubscription = {
      schemaVersion: SCHEMA_VERSION,
      companyId,
      subscription: serialize(subscription),
      cachedAt: now,
    };
    setJson(`${STORAGE_PREFIX}${companyId}`, payload);
  } catch {
    // A cache write failure must never break a purchase or a render.
  }
}

/**
 * Whether a cached record may still be trusted.
 *
 * Two independent bounds, both must hold:
 *  - the paid period has not ended (plus `GRACE_DAYS`)
 *  - the cache was written within `OFFLINE_MAX_DAYS`
 */
export function isCacheTrustworthy(cached: CachedEntitlement, now = Date.now()): boolean {
  if (now - cached.cachedAt > OFFLINE_MAX_DAYS * DAY_MS) return false;

  const subscription = cached.subscription;
  if (!subscription) return true; // "no subscription" does not expire into "subscribed".
  if (!subscription.proActive) return true;

  const periodEnd = subscription.gracePeriodEnd ?? subscription.currentPeriodEnd;
  if (!periodEnd) return true; // Open-ended (enterprise contract) — bounded by cache age alone.

  return now <= periodEnd.getTime() + GRACE_DAYS * DAY_MS;
}

export async function clearEntitlementCaches(): Promise<void> {
  clearNamespace(STORAGE_PREFIX);
  // Also drop the v1 namespace left by the pre-IAP implementation.
  clearNamespace('autocore-mobile:subscription:v1:');
}
