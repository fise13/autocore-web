/**
 * SubscriptionManager — L3 orchestrator.
 *
 * The only module that knows about all three sources at once. It owns the
 * purchase and restore choreography, the pending-transaction drain, and the
 * reconcile schedule. Everything it does ends with the server deciding and the
 * Firestore listener pushing the result back to the UI.
 */
import { Platform } from 'react-native';

import {
  fetchAppAccountToken,
  refreshCompanyBilling,
  restoreApplePurchases,
  startCompanyTrial,
  verifyApplePurchase,
  type AppleVerificationRejection,
} from '@/services/api/subscriptions';

import { PLANS, planById, planForSku, purchasablePlans, skuForPlan } from './catalog';
import {
  devProducts,
  isDevModeActive,
  isDevModeAvailable,
  scenarioForPlan,
  setDevScenario,
} from './dev-mode';
import { clearEntitlementCaches } from './entitlement-cache';
import {
  clearEntitlementRegistry,
  peekEntitlement,
  setLocalSubscriptions,
} from './entitlement-registry';
import type { LocalActiveSubscription } from './entitlement-resolver';
import * as store from './purchase-manager';
import {
  getFlow,
  isFlowBusy,
  resetPurchaseStore,
  setFlow,
  setIntroEligible,
  setProducts,
  setProductsError,
  setProductsLoading,
} from './purchase-store';
import { asPurchaseFailure, failure, isCancellation } from './purchase-errors';
import type { PlanId, PurchaseFailure, RestoreOutcome } from './types';

/** Company the manager is currently acting for. Set by the provider. */
let activeCompanyId: string | null = null;

/** Cached app account tokens, keyed by company. */
const tokenCache = new Map<string, string>();

/** Transactions already verified this session — avoids re-posting on replay. */
const verifiedTransactions = new Set<string>();

let detachPurchaseListener: (() => void) | null = null;
let detachFailureListener: (() => void) | null = null;
let reconcileInFlight: Promise<void> | null = null;

const REJECTION_FAILURE: Record<AppleVerificationRejection, PurchaseFailure> = {
  signature_invalid: failure('verification_failed'),
  bundle_mismatch: failure('verification_failed'),
  environment_mismatch: failure('verification_failed'),
  token_mismatch: failure('verification_failed'),
  bound_to_other_company: failure('bound_to_other_company'),
  expired: failure('verification_failed'),
  revoked: failure('verification_failed'),
  superseded_by_stripe: failure('already_owned'),
};

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/**
 * Bind the manager to a company and start observing the transaction queue.
 *
 * Called by `SubscriptionProvider` once the session resolves. Switching
 * companies re-binds; entitlement is never carried across workspaces.
 */
export function attach(companyId: string | null): void {
  if (activeCompanyId === companyId && detachPurchaseListener) return;

  activeCompanyId = companyId;
  verifiedTransactions.clear();

  if (!detachPurchaseListener) {
    store.installListeners();

    detachPurchaseListener = store.onPurchase((purchase) => {
      void handleIncomingPurchase(purchase);
    });

    detachFailureListener = store.onPurchaseFailure((value) => {
      // A queue-level error with no purchase in flight is informational only.
      if (isCancellation(value)) {
        setFlow({ phase: 'cancelled' });
        return;
      }
      setFlow({ phase: 'failed', failure: value });
    });
  }

  if (companyId) {
    void bootstrap(companyId);
  }
}

/** Sign-out teardown. */
export async function detach(): Promise<void> {
  detachPurchaseListener?.();
  detachFailureListener?.();
  detachPurchaseListener = null;
  detachFailureListener = null;
  activeCompanyId = null;
  tokenCache.clear();
  verifiedTransactions.clear();
  clearEntitlementRegistry();
  resetPurchaseStore();
  await clearEntitlementCaches();
  await store.disconnect();
}

async function bootstrap(companyId: string): Promise<void> {
  // The catalog and the server reconcile do not depend on StoreKit being
  // available, so they must run even where it is not — otherwise the paywall
  // has nothing to show on web or in a simulator without store configuration.
  void loadProducts();
  void reconcile(companyId);

  if (!store.isStoreSupported()) return;

  // Order matters: refreshing local StoreKit state first means the resolver has
  // a fallback ready before any network call is attempted.
  await refreshLocalSubscriptions();
  await drainPendingTransactions();
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

/**
 * Simulated catalog used when there is no real one — no App Store Connect
 * products, no Paid Applications Agreement, or running in the simulator.
 */
function devCatalog() {
  return devProducts(
    purchasablePlans().map((plan) => ({
      id: plan.id,
      sku: plan.appleSku ?? plan.googleSku ?? plan.id,
      label: plan.label,
    })),
  );
}

/** Fetch the live product catalog. Prices always come from the store. */
export async function loadProducts(): Promise<void> {
  setProductsLoading(true);

  if (!store.isStoreSupported()) {
    // Web / unsupported platform: dev gets a catalog to look at, production
    // gets an honest empty state.
    setProducts(isDevModeAvailable() ? devCatalog() : []);
    if (isDevModeAvailable()) setIntroEligible(true);
    return;
  }

  try {
    const products = await store.loadProducts();

    // An empty result is the normal symptom of missing store configuration; in
    // development that would leave the paywall blank and untestable.
    if (products.length === 0 && isDevModeAvailable()) {
      setProducts(devCatalog());
      setIntroEligible(true);
      return;
    }

    setProducts(products);

    // Intro-offer eligibility is per subscription group; the live plans all
    // share one, so the first purchasable plan answers for all of them.
    const [first] = purchasablePlans();
    if (first) {
      setIntroEligible(await store.isEligibleForIntroOffer(first));
    }
  } catch (error) {
    if (isDevModeAvailable()) {
      setProducts(devCatalog());
      setIntroEligible(true);
      return;
    }
    setProductsError(asPurchaseFailure(error).message);
  }
}

// ---------------------------------------------------------------------------
// Purchase
// ---------------------------------------------------------------------------

async function appAccountToken(companyId: string): Promise<string> {
  const cached = tokenCache.get(companyId);
  if (cached) return cached;

  const { appAccountToken: token } = await fetchAppAccountToken(companyId);
  tokenCache.set(companyId, token);
  return token;
}

/**
 * Begin a purchase. Resolves as soon as the request is dispatched — the actual
 * outcome arrives through the transaction listener and lands in the flow state.
 */
export async function purchase(planId: PlanId): Promise<void> {
  const companyId = activeCompanyId;
  if (!companyId) {
    setFlow({ phase: 'failed', failure: failure('unknown') });
    return;
  }

  if (isFlowBusy()) return;

  // With a dev scenario active there is no verification endpoint to call, so
  // the simulated path is the only one that can complete.
  if (isDevModeActive()) {
    await devSimulatePurchase(planId);
    return;
  }

  const plan = planById(planId);
  if (!plan.purchasable || !skuForPlan(plan)) {
    setFlow({ phase: 'failed', failure: failure('not_available') });
    return;
  }

  // Buying while Stripe or an Enterprise contract is active would double-bill.
  const entitlement = peekEntitlement(companyId);
  if (entitlement.managedExternally) {
    setFlow({ phase: 'already_purchased' });
    return;
  }

  setFlow({ phase: 'loading', planId });

  try {
    const token = await appAccountToken(companyId);
    await store.purchase(plan, token);
    // Outcome continues in `handleIncomingPurchase`.
  } catch (error) {
    const value = asPurchaseFailure(error);

    if (isCancellation(value)) {
      setFlow({ phase: 'cancelled' });
      return;
    }
    if (value.code === 'already_owned') {
      setFlow({ phase: 'already_purchased' });
      return;
    }
    setFlow({ phase: 'failed', failure: value });
  }
}

/**
 * Handle a transaction from the StoreKit queue — a fresh purchase, a renewal,
 * an Ask-to-Buy approval, or one replayed after a crash.
 */
async function handleIncomingPurchase(purchaseValue: store.Purchase): Promise<void> {
  const companyId = activeCompanyId;
  if (!companyId) return;

  const plan = planForSku(purchaseValue.productId);
  const planId: PlanId = plan?.id ?? 'pro_monthly';

  // A deferred purchase carries no entitlement yet; it converts later and comes
  // back through this same listener.
  if (purchaseValue.purchaseState === 'pending') {
    setFlow({ phase: 'pending', planId });
    return;
  }

  if (verifiedTransactions.has(purchaseValue.id)) return;

  const flow = getFlow();
  const isUserInitiated = flow.phase === 'loading' || flow.phase === 'verifying';
  if (isUserInitiated) {
    setFlow({ phase: 'verifying', planId });
  }

  try {
    const token = tokenCache.get(companyId) ?? null;
    const response = await verifyApplePurchase({
      companyId,
      transactionId: purchaseValue.id,
      jws: purchaseValue.purchaseToken ?? null,
      productId: purchaseValue.productId,
      appAccountToken: token,
    });

    if (!response.accepted) {
      const value = response.reason
        ? REJECTION_FAILURE[response.reason]
        : failure('verification_failed');
      if (isUserInitiated) setFlow({ phase: 'failed', failure: value });
      return;
    }

    // Only now is it safe to remove the transaction from the queue.
    verifiedTransactions.add(purchaseValue.id);
    await store.finish(purchaseValue);
    await refreshLocalSubscriptions();

    if (isUserInitiated) {
      setFlow({ phase: 'success', planId });
    }
  } catch (error) {
    // Leave the transaction unfinished: StoreKit replays it on next launch and
    // `drainPendingTransactions` retries. This is correct, not a leak.
    if (isUserInitiated) {
      setFlow({ phase: 'failed', failure: asPurchaseFailure(error) });
    }
  }
}

/**
 * Validate and finish anything left in the queue.
 *
 * Runs on every boot so Ask-to-Buy approvals, SCA-deferred purchases and
 * mid-purchase crashes all converge without the user doing anything.
 */
export async function drainPendingTransactions(): Promise<void> {
  if (!activeCompanyId || !store.isStoreSupported()) return;

  try {
    const pending = await store.listPurchases(false);
    for (const item of pending) {
      await handleIncomingPurchase(item);
    }
  } catch {
    // Offline; the next foreground reconcile retries.
  }
}

// ---------------------------------------------------------------------------
// Restore
// ---------------------------------------------------------------------------

/**
 * Explicit user-initiated restore. Every branch produces a distinct message —
 * a silent no-op here is the most common subscription App Review rejection.
 */
export async function restore(): Promise<RestoreOutcome> {
  if (isFlowBusy()) return { kind: 'empty' };

  if (isDevModeActive()) {
    await devSimulateRestore();
    return { kind: 'restored', planId: 'pro_monthly' };
  }

  setFlow({ phase: 'restoring' });

  try {
    // Do not call `store.sync()` / `syncIOS()` here. That sheet backgrounds the
    // app and Firestore 12.x hard-asserts (ca9 / b815) on the listen stream.
    const purchases = await store.listPurchases(true).catch(() => []);

    if (purchases.length === 0) {
      setFlow({ phase: 'restore_empty' });
      return { kind: 'empty' };
    }

    const companyId = activeCompanyId;
    if (!companyId) {
      setFlow({ phase: 'restore_empty' });
      return { kind: 'empty' };
    }

    const response = await restoreApplePurchases({
      companyId,
      transactions: purchases.map((item) => ({
        transactionId: item.id,
        jws: item.purchaseToken ?? null,
        productId: item.productId,
      })),
    });

    if (!response.restored) {
      if (response.reason === 'bound_to_other_company') {
        const value = REJECTION_FAILURE.bound_to_other_company;
        setFlow({ phase: 'failed', failure: value });
        return { kind: 'conflict', message: value.message };
      }
      if (response.reason === 'expired') {
        setFlow({ phase: 'expired' });
        return { kind: 'expired' };
      }
      const value = response.reason
        ? REJECTION_FAILURE[response.reason]
        : failure('verification_failed');
      setFlow({ phase: 'failed', failure: value });
      return { kind: 'failed', failure: value };
    }

    for (const item of purchases) {
      verifiedTransactions.add(item.id);
      await store.finish(item).catch(() => undefined);
    }

    await refreshLocalSubscriptions().catch(() => undefined);

    const planId = (planForSku(purchases[0].productId)?.id ?? 'pro_monthly') as PlanId;
    setFlow({ phase: 'restored', planId });
    return { kind: 'restored', planId };
  } catch (error) {
    const value = asPurchaseFailure(error);
    setFlow({ phase: 'failed', failure: value });
    return { kind: 'failed', failure: value };
  }
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

/** Publish StoreKit's local view into the resolver's third source. */
export async function refreshLocalSubscriptions(): Promise<void> {
  if (!store.isStoreSupported()) {
    setLocalSubscriptions([]);
    return;
  }

  const active = await store.listActiveSubscriptions();
  const mapped: LocalActiveSubscription[] = active.map((item) => ({
    productId: item.productId,
    isActive: item.isActive,
    expirationDateMs: item.expirationDateIOS ?? null,
    willAutoRenew: item.renewalInfoIOS?.willAutoRenew ?? true,
  }));
  setLocalSubscriptions(mapped);
}

/**
 * Push-side reconciliation: force the server to re-evaluate expiry, then pull
 * StoreKit state. De-duplicated — concurrent callers share one round-trip.
 */
export function reconcile(companyId: string | null = activeCompanyId): Promise<void> {
  if (!companyId) return Promise.resolve();
  if (reconcileInFlight) return reconcileInFlight;

  reconcileInFlight = (async () => {
    try {
      await refreshCompanyBilling(companyId);
    } catch {
      // Offline or transient; the Firestore listener remains the source of truth.
    }
    try {
      await refreshLocalSubscriptions();
      await drainPendingTransactions();
    } catch {
      // Best effort.
    }
  })().finally(() => {
    reconcileInFlight = null;
  });

  return reconcileInFlight;
}

/** Internal 14-day trial (non-Apple). Server enforces one per company. */
export async function startInternalTrial(): Promise<boolean> {
  const companyId = activeCompanyId;
  if (!companyId) return false;

  setFlow({ phase: 'loading', planId: 'pro_monthly' });
  try {
    const result = await startCompanyTrial(companyId);
    if (result.started || result.proActive) {
      setFlow({ phase: 'success', planId: 'pro_monthly' });
      return true;
    }
    setFlow({ phase: 'failed', failure: failure('not_available') });
    return false;
  } catch (error) {
    setFlow({ phase: 'failed', failure: asPurchaseFailure(error) });
    return false;
  }
}

/** Apple's native manage sheet. We never build our own cancel button. */
export async function openManageSubscriptions(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  await store.openNativeManageSubscriptions();
}

export function resetFlow(): void {
  setFlow({ phase: 'idle' });
}

export function getActiveCompanyId(): string | null {
  return activeCompanyId;
}

// ---------------------------------------------------------------------------
// Development simulator
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run a purchase end-to-end without StoreKit or the server.
 *
 * It drives the **real** flow state machine with realistic timing, so what is
 * exercised is the actual UI path — loading, verifying, success — rather than a
 * shortcut that skips straight to entitled.
 */
export async function devSimulatePurchase(planId: PlanId): Promise<void> {
  if (!isDevModeAvailable()) return;

  setFlow({ phase: 'loading', planId });
  await delay(700);
  setFlow({ phase: 'verifying', planId });
  await delay(600);

  setDevScenario(scenarioForPlan(planId));
  setFlow({ phase: 'success', planId });
}

/** Simulated restore, including the "nothing to restore" branch. */
export async function devSimulateRestore(): Promise<void> {
  if (!isDevModeAvailable()) return;

  setFlow({ phase: 'restoring' });
  await delay(900);

  if (peekEntitlement(activeCompanyId).isActive) {
    setFlow({ phase: 'restored', planId: 'pro_monthly' });
    return;
  }

  setDevScenario('pro_monthly');
  setFlow({ phase: 'restored', planId: 'pro_monthly' });
}

/** Every plan the dev panel can offer, for building its buttons. */
export function devPurchasablePlanIds(): PlanId[] {
  return Object.values(PLANS)
    .filter((plan) => plan.purchasable)
    .map((plan) => plan.id);
}
