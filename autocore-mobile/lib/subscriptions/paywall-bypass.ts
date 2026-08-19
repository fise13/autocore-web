/**
 * Skip the mandatory subscription gate without buying.
 *
 * "Not now" lets a signed-in owner into the app on the
 * free tier. It does **not** grant Pro — feature gates still apply. The choice
 * is persisted so the paywall does not reappear on every launch.
 *
 * Screenshot builds (`EXPO_PUBLIC_STORE_SHOTS=1`) are the exception: bypass
 * paints complimentary Pro so App Store fixtures can show the paid product
 * without a real receipt.
 */
import { getString, remove, setString } from '@/lib/storage/kv';
import type { Entitlement, PlanId } from './types';

const STORAGE_KEY = 'autocore-mobile:paywall-bypass:v1';

let hydrated = false;
let bypassed = false;
const listeners = new Set<() => void>();

export function isStoreShotsBuild(): boolean {
  return process.env.EXPO_PUBLIC_STORE_SHOTS === '1';
}

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

/** Local Pro while StoreKit checkout is still being finished — store-shot builds only. */
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
