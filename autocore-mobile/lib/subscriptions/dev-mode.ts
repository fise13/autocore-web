/**
 * Development simulator — `__DEV__` only.
 *
 * The real flow needs three things that do not exist on a developer's machine:
 * a verification endpoint, App Store Connect products, and a sandbox Apple ID.
 * This substitutes all three so the entire subscription experience — paywall,
 * purchase states, trial countdown, grace period, expiry, offline — can be
 * driven from one button.
 *
 * Safety: every entry point returns an inert value when `__DEV__` is false, so
 * none of this can influence a release build even if a call site forgets to
 * guard. The override is also surfaced in the UI (`source: 'dev'`) so a
 * simulated entitlement can never be mistaken for a real one.
 */
import { getJson, remove, setJson } from '@/lib/storage/kv';
import type { CompanySubscription } from '@/types/billing';

import type { PlanId, StoreProduct } from './types';

const STORAGE_KEY = 'autocore-mobile:subscription:dev-scenario:v1';

const DAY_MS = 24 * 60 * 60 * 1000;

export type DevScenarioId =
  | 'off'
  | 'free'
  | 'trial'
  | 'pro_monthly'
  | 'pro_yearly'
  | 'ending'
  | 'past_due'
  | 'expired'
  | 'stripe'
  | 'enterprise';

export type DevScenario = {
  id: DevScenarioId;
  label: string;
  description: string;
  build: (now: number) => CompanySubscription | null;
};

function base(now: number): CompanySubscription {
  return {
    plan: 'pro',
    status: 'active',
    proActive: true,
    provider: 'apple',
    billingInterval: 'monthly',
    currentPeriodEnd: new Date(now + 21 * DAY_MS),
    willAutoRenew: true,
    trialUsed: true,
    appleProductId: 'com.wise.autocore.pro.monthly',
    appleEnvironment: 'Sandbox',
    updatedAt: new Date(now),
  };
}

/**
 * One scenario per distinct UI state, so every branch of the status card,
 * paywall and gate can be reached without waiting for real billing events.
 */
export const DEV_SCENARIOS: DevScenario[] = [
  {
    id: 'off',
    label: 'Off',
    description: 'Use the real server + StoreKit',
    build: () => null,
  },
  {
    id: 'free',
    label: 'Free',
    description: 'No subscription — paywall and gates locked',
    build: (now) => ({
      ...base(now),
      plan: 'free',
      proActive: false,
      provider: 'internal',
      currentPeriodEnd: null,
      willAutoRenew: false,
      trialUsed: false,
      appleProductId: null,
    }),
  },
  {
    id: 'trial',
    label: 'Trial',
    description: '12 days left — trial countdown',
    build: (now) => ({
      ...base(now),
      status: 'trialing',
      currentPeriodEnd: new Date(now + 12 * DAY_MS),
      trialUsed: true,
    }),
  },
  {
    id: 'pro_monthly',
    label: 'Pro monthly',
    description: 'Active, renews in 21 days',
    build: (now) => base(now),
  },
  {
    id: 'pro_yearly',
    label: 'Pro yearly',
    description: 'Active yearly plan',
    build: (now) => ({
      ...base(now),
      billingInterval: 'yearly',
      currentPeriodEnd: new Date(now + 210 * DAY_MS),
      appleProductId: 'com.wise.autocore.pro.yearly',
    }),
  },
  {
    id: 'ending',
    label: 'Ending',
    description: 'Auto-renew off — access until date',
    build: (now) => ({
      ...base(now),
      willAutoRenew: false,
      currentPeriodEnd: new Date(now + 5 * DAY_MS),
    }),
  },
  {
    id: 'past_due',
    label: 'Past due',
    description: 'Billing retry — grace period',
    build: (now) => ({
      ...base(now),
      status: 'past_due',
      gracePeriodEnd: new Date(now + 4 * DAY_MS),
    }),
  },
  {
    id: 'expired',
    label: 'Expired',
    description: 'Subscription ended — restore / re-subscribe',
    build: (now) => ({
      ...base(now),
      plan: 'free',
      status: 'canceled',
      proActive: false,
      willAutoRenew: false,
      currentPeriodEnd: new Date(now - 2 * DAY_MS),
    }),
  },
  {
    id: 'stripe',
    label: 'Stripe',
    description: 'Billed on the web — purchase CTAs hidden',
    build: (now) => ({
      ...base(now),
      provider: 'stripe',
      appleProductId: null,
      appleEnvironment: null,
    }),
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    description: 'Contract plan — managed externally',
    build: (now) => ({
      ...base(now),
      plan: 'enterprise',
      provider: 'internal',
      billingInterval: 'yearly',
      currentPeriodEnd: new Date(now + 300 * DAY_MS),
      appleProductId: null,
    }),
  },
];

export function isDevModeAvailable(): boolean {
  return __DEV__;
}

type DevState = {
  scenario: DevScenarioId;
  /** Simulates a dropped connection so offline behaviour can be exercised. */
  forceOffline: boolean;
};

const DEFAULT_STATE: DevState = { scenario: 'off', forceOffline: false };

let state: DevState = DEFAULT_STATE;
let hydrated = false;

const listeners = new Set<() => void>();

function hydrate(): void {
  if (hydrated || !__DEV__) return;
  hydrated = true;
  const stored = getJson<DevState>(STORAGE_KEY);
  if (stored && DEV_SCENARIOS.some((entry) => entry.id === stored.scenario)) {
    state = { scenario: stored.scenario, forceOffline: stored.forceOffline === true };
  }
}

function emit(next: DevState): void {
  state = next;
  setJson(STORAGE_KEY, next);
  for (const listener of listeners) listener();
}

export function subscribeDevMode(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDevState(): DevState {
  if (!__DEV__) return DEFAULT_STATE;
  hydrate();
  return state;
}

export function setDevScenario(scenario: DevScenarioId): void {
  if (!__DEV__) return;
  hydrate();
  emit({ ...state, scenario });
}

export function setDevForceOffline(forceOffline: boolean): void {
  if (!__DEV__) return;
  hydrate();
  emit({ ...state, forceOffline });
}

export function clearDevMode(): void {
  if (!__DEV__) return;
  hydrated = true;
  state = DEFAULT_STATE;
  remove(STORAGE_KEY);
  for (const listener of listeners) listener();
}

export function isDevModeActive(): boolean {
  return __DEV__ && getDevState().scenario !== 'off';
}

export function isDevForcedOffline(): boolean {
  return __DEV__ && getDevState().forceOffline;
}

/**
 * The simulated subscription document, rebuilt on every read so relative dates
 * ("12 days left") stay correct as the clock moves.
 */
export function devSubscription(now = Date.now()): CompanySubscription | null | undefined {
  if (!__DEV__) return undefined;
  const { scenario } = getDevState();
  if (scenario === 'off') return undefined;
  const entry = DEV_SCENARIOS.find((item) => item.id === scenario);
  return entry ? entry.build(now) : undefined;
}

// ---------------------------------------------------------------------------
// Fake store catalog
// ---------------------------------------------------------------------------

const DEV_PRICES: Record<string, { amount: number; currency: string }> = {
  pro_monthly: { amount: 24.99, currency: 'EUR' },
  pro_yearly: { amount: 239.9, currency: 'EUR' },
};

/**
 * Format like a real storefront would, so the paywall exercises the same
 * "display the string the store gave us" path rather than a placeholder.
 */
function devDisplayPrice(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/** Stand-in products for when StoreKit has no App Store Connect entries. */
export function devProducts(plans: Array<{ id: PlanId; sku: string; label: string }>): StoreProduct[] {
  if (!__DEV__) return [];

  return plans.map((plan) => {
    const price = DEV_PRICES[plan.id] ?? { amount: 24.99, currency: 'EUR' };
    return {
      planId: plan.id,
      sku: plan.sku,
      displayPrice: devDisplayPrice(price.amount, price.currency),
      priceAmount: price.amount,
      currency: price.currency,
      title: plan.label,
      description: 'Simulated product (development only)',
      interval: plan.id === 'pro_yearly' ? 'yearly' : 'monthly',
      introOffer: {
        displayPrice: 'Free',
        periodCount: 7,
        periodUnit: 'day',
        isFreeTrial: true,
      },
    };
  });
}

/** Which plan a scenario corresponds to, for the "simulate purchase" button. */
export function scenarioForPlan(planId: PlanId): DevScenarioId {
  return planId === 'pro_yearly' ? 'pro_yearly' : 'pro_monthly';
}
