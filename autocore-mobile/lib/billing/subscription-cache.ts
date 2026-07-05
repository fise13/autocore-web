import type { BillingPlan, BillingStatus, CompanySubscription } from '@/types/billing';

import { clearNamespace, getJson, setJson } from '@/lib/storage/kv';
import { ensureAsyncStorageMigrated } from '@/lib/storage/migrate-async-storage';

const STORAGE_PREFIX = 'autocore-mobile:subscription:v1:';

type CachedSubscription = {
  companyId: string;
  subscription: SerializedSubscription | null;
  savedAt: number;
};

type SerializedSubscription = {
  plan: BillingPlan;
  status: BillingStatus;
  proActive: boolean;
  provider: 'internal' | 'stripe';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  priceId?: string;
  billingInterval?: 'monthly' | 'yearly' | null;
  currentPeriodEnd?: string | null;
  stripeUpdatedAt?: string | null;
  updatedAt?: string | null;
};

function serializeSubscription(subscription: CompanySubscription | null): SerializedSubscription | null {
  if (!subscription) return null;
  return {
    plan: subscription.plan,
    status: subscription.status,
    proActive: subscription.proActive,
    provider: subscription.provider,
    stripeCustomerId: subscription.stripeCustomerId,
    stripeSubscriptionId: subscription.stripeSubscriptionId,
    priceId: subscription.priceId,
    billingInterval: subscription.billingInterval,
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
    stripeUpdatedAt: subscription.stripeUpdatedAt?.toISOString() ?? null,
    updatedAt: subscription.updatedAt?.toISOString() ?? null,
  };
}

function deserializeSubscription(subscription: SerializedSubscription | null): CompanySubscription | null {
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
    currentPeriodEnd: subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null,
    stripeUpdatedAt: subscription.stripeUpdatedAt ? new Date(subscription.stripeUpdatedAt) : null,
    updatedAt: subscription.updatedAt ? new Date(subscription.updatedAt) : null,
  };
}

export function readSubscriptionCacheSync(
  companyId: string,
): CompanySubscription | null | undefined {
  const parsed = getJson<CachedSubscription>(`${STORAGE_PREFIX}${companyId}`);
  if (!parsed) return undefined;
  if (parsed.companyId !== companyId) return undefined;
  return deserializeSubscription(parsed.subscription);
}

export async function readSubscriptionCache(
  companyId: string,
): Promise<CompanySubscription | null | undefined> {
  await ensureAsyncStorageMigrated();
  return readSubscriptionCacheSync(companyId);
}

export async function writeSubscriptionCache(
  companyId: string,
  subscription: CompanySubscription | null,
): Promise<void> {
  try {
    const payload: CachedSubscription = {
      companyId,
      subscription: serializeSubscription(subscription),
      savedAt: Date.now(),
    };
    setJson(`${STORAGE_PREFIX}${companyId}`, payload);
  } catch {
    // ignore
  }
}

export async function clearSubscriptionCaches(): Promise<void> {
  clearNamespace(STORAGE_PREFIX);
}
