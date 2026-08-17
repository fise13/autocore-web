/**
 * TEMPORARY — paywall escape hatch.
 *
 * Lets a signed-in user without a subscription past the blocking gate and into
 * the app. It exists so the product can be walked through end to end before the
 * first release, while billing is still being wired up.
 *
 * This is a revenue hole once the app is live: anyone can tap it and use the
 * product for free. Delete this file and its three call sites — `AuthGate`,
 * `PaywallScreen`, and the export below — before the app has paying customers.
 *
 * It is deliberately not `__DEV__`-only, because the point is to be able to walk
 * a TestFlight or review build; that is also exactly why it must not outlive the
 * launch.
 */
import { getString, remove, setString } from '@/lib/storage/kv';
import type { Entitlement, PlanId } from './types';

const STORAGE_KEY = 'autocore-mobile:paywall-bypass:v1';

let hydrated = false;
let bypassed = false;
const listeners = new Set<() => void>();

function hydrate(): void {
  if (hydrated) return;
  hydrated = true;
  bypassed = getString(STORAGE_KEY) === '1';
}

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribePaywallBypass(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Persisted so the choice survives a reload rather than re-prompting. */
export function isPaywallBypassed(): boolean {
  hydrate();
  return bypassed;
}

export function setPaywallBypassed(value: boolean): void {
  hydrate();
  if (bypassed === value) return;
  bypassed = value;
  if (value) {
    setString(STORAGE_KEY, '1');
  } else {
    remove(STORAGE_KEY);
  }
  emit();
}

/** Local Pro while StoreKit checkout is still being finished. */
export function complimentaryProEntitlement(
  companyId: string | null,
  planId: PlanId = 'pro_monthly',
): Entitlement {
  return {
    companyId,
    tier: 'pro',
    planId: planId === 'pro_yearly' ? 'pro_yearly' : 'pro_monthly',
    status: 'active',
    isActive: true,
    isTrial: false,
    trialEndsAt: null,
    trialUsed: false,
    renewsAt: null,
    willAutoRenew: false,
    inGracePeriod: false,
    provider: 'internal',
    managedExternally: false,
    source: 'local_unverified',
  };
}
