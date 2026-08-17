/**
 * Screenshot-mode Pro.
 *
 * This used to be a "Continue without a subscription" button on the paywall,
 * which meant anyone — including every TestFlight tester — could tap past the
 * gate and use the product for free, permanently, because the choice was
 * persisted. That button is gone and the setter below is now inert in any
 * normal build.
 *
 * What remains serves one purpose: `EXPO_PUBLIC_STORE_SHOTS=1` builds render
 * the App Store screenshot fixtures, which have to show the paid product
 * without a real subscription. That is a build-time flag, not something a user
 * can reach.
 *
 * Anything persisted by the old button is cleared on first read, so installs
 * that already tapped it fall back behind the paywall instead of staying free
 * forever.
 */
import { getString, remove, setString } from '@/lib/storage/kv';
import type { Entitlement, PlanId } from './types';

const STORAGE_KEY = 'autocore-mobile:paywall-bypass:v1';

let hydrated = false;
let bypassed = false;
const listeners = new Set<() => void>();

/** Only screenshot builds may hold a bypass. */
function storeShotsBuild(): boolean {
  return process.env.EXPO_PUBLIC_STORE_SHOTS === '1';
}

function hydrate(): void {
  if (hydrated) return;
  hydrated = true;

  if (!storeShotsBuild()) {
    // Retire a value left by the old escape-hatch button.
    remove(STORAGE_KEY);
    bypassed = false;
    return;
  }

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
  // Granting is screenshot-only; clearing is always allowed.
  if (value && !storeShotsBuild()) return;
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
