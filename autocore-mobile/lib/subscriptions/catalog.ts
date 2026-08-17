/**
 * Plan catalog — L0. The single source of truth for tiers and SKUs.
 *
 * No other module hardcodes a SKU or compares tier strings by hand. Shipping
 * the yearly plan is a one-word change here (`hidden` → `live`) plus the
 * matching App Store Connect product — nothing else in the app needs to know.
 */
import { Platform } from 'react-native';

import type { BillingInterval, PlanId, SubscriptionTier } from './types';

export type PlanAvailability = 'live' | 'hidden';

export type PlanDescriptor = {
  id: PlanId;
  tier: SubscriptionTier;
  interval: BillingInterval | null;
  /** Total order for upgrade/downgrade comparison. Higher wins. */
  rank: number;
  appleSku: string | null;
  googleSku: string | null;
  /** iOS subscription group — shared by monthly/yearly so StoreKit prorates. */
  subscriptionGroupIdIOS: string | null;
  /** False ⇒ never offered through an in-app purchase (Free, Enterprise). */
  purchasable: boolean;
  /** `hidden` ⇒ resolvable from a receipt, but not rendered in the paywall. */
  availability: PlanAvailability;
  /** Display name, used in the paywall and the manage screen. */
  label: string;
};

const APPLE_SUBSCRIPTION_GROUP = 'autocore_pro';

export const PLANS: Record<PlanId, PlanDescriptor> = {
  free: {
    id: 'free',
    tier: 'free',
    interval: null,
    rank: 0,
    appleSku: null,
    googleSku: null,
    subscriptionGroupIdIOS: null,
    purchasable: false,
    availability: 'live',
    label: 'Free',
  },
  pro_monthly: {
    id: 'pro_monthly',
    tier: 'pro',
    interval: 'monthly',
    rank: 10,
    appleSku: 'com.autocore.pro.monthly',
    googleSku: 'autocore_pro_monthly',
    subscriptionGroupIdIOS: APPLE_SUBSCRIPTION_GROUP,
    purchasable: true,
    availability: 'live',
    label: 'AutoCore Pro',
  },
  pro_yearly: {
    id: 'pro_yearly',
    tier: 'pro',
    interval: 'yearly',
    rank: 20,
    appleSku: 'com.autocore.pro.yearly',
    googleSku: 'autocore_pro_yearly',
    subscriptionGroupIdIOS: APPLE_SUBSCRIPTION_GROUP,
    purchasable: true,
    // Offered when StoreKit returns the product. Hidden until then via empty catalog.
    availability: 'live',
    label: 'AutoCore Pro',
  },
  enterprise: {
    id: 'enterprise',
    tier: 'enterprise',
    interval: 'yearly',
    rank: 100,
    appleSku: null,
    googleSku: null,
    subscriptionGroupIdIOS: null,
    // Sales contract only — never through the App Store.
    purchasable: false,
    availability: 'live',
    label: 'Enterprise',
  },
};

export const TIER_RANK: Record<SubscriptionTier, number> = {
  free: 0,
  pro: 10,
  enterprise: 20,
};

export function planById(id: PlanId): PlanDescriptor {
  return PLANS[id];
}

/** Platform-correct store identifier for a plan, or null if not purchasable here. */
export function skuForPlan(plan: PlanDescriptor): string | null {
  return Platform.OS === 'ios' ? plan.appleSku : Platform.OS === 'android' ? plan.googleSku : null;
}

const LEGACY_APPLE_SKUS: Record<string, PlanId> = {
  'com.wise.autocore.pro.monthly': 'pro_monthly',
  'com.wise.autocore.pro.yearly': 'pro_yearly',
};

/** Reverse lookup from a store product identifier. */
export function planForSku(sku: string): PlanDescriptor | null {
  const legacy = LEGACY_APPLE_SKUS[sku];
  if (legacy) return PLANS[legacy];
  for (const plan of Object.values(PLANS)) {
    if (plan.appleSku === sku || plan.googleSku === sku) return plan;
  }
  return null;
}

/** Plans offered in the paywall, cheapest first. Excludes hidden and free. */
export function purchasablePlans(): PlanDescriptor[] {
  return Object.values(PLANS)
    .filter((plan) => plan.purchasable && plan.availability === 'live' && skuForPlan(plan) !== null)
    .sort((a, b) => a.rank - b.rank);
}

/** Every SKU we need to ask the store about — includes hidden plans so an
 *  existing yearly subscriber still resolves correctly before we launch it. */
export function allStoreSkus(): string[] {
  return Object.values(PLANS)
    .map(skuForPlan)
    .filter((sku): sku is string => sku !== null);
}

export function tierRank(tier: SubscriptionTier): number {
  return TIER_RANK[tier];
}

/** `true` when `tier` satisfies a `required` tier gate. */
export function tierSatisfies(tier: SubscriptionTier, required: SubscriptionTier): boolean {
  return tierRank(tier) >= tierRank(required);
}

export function comparePlans(a: PlanId, b: PlanId): number {
  return PLANS[a].rank - PLANS[b].rank;
}

/** Highest-ranked plan among the given ids — used when a receipt yields several. */
export function highestPlan(ids: PlanId[]): PlanId {
  return ids.reduce<PlanId>((best, id) => (comparePlans(id, best) > 0 ? id : best), 'free');
}
