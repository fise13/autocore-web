/**
 * SubscriptionManager — L3 orchestrator.
 *
 * The only module that knows about all three sources at once. It owns the
 * purchase and restore choreography, the pending-transaction drain, and the
 * reconcile schedule. Everything it does ends with the server deciding and the
 * Firestore listener pushing the result back to the UI.
 */
import { Platform } from 'react-native';

import { getString, setString } from '@/lib/storage/kv';

import {
  fetchAppAccountToken,
  refreshCompanyBilling,
  restoreApplePurchases,
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
  optimisticAppleEntitlement,
  peekEntitlement,
  setLocalSubscriptions,
  setOptimisticEntitlement,
} from './entitlement-registry';
import type { LocalActiveSubscription } from './entitlement-resolver';
import * as store from './purchase-manager';
import {
  getFlow,
  getPurchaseStoreSnapshot,
  isFlowBusy,
  resetPurchaseStore,
  setFlow,
  setGateCelebrationLock,
  setIntroEligible,
  setProducts,
  setProductsError,
  setProductsLoading,
  setStorePrepared,
  upsertProduct,
} from './purchase-store';
import { isPaywallBypassed } from './paywall-bypass';
import { asPurchaseFailure, failure, isCancellation, isInFlightGhostError } from './purchase-errors';
import { iapTrace, iapTraceReset } from './iap-trace';
import type { PlanId, PurchaseFailure, RestoreOutcome } from './types';

/** Company the manager is currently acting for. Set by the provider. */
let activeCompanyId: string | null = null;

/** Cached app account tokens, keyed by company. */
const tokenCache = new Map<string, string>();

const APP_ACCOUNT_TOKEN_KEY = (companyId: string) =>
  `autocore-mobile:apple-aat:v1:${companyId}`;

function persistAppAccountToken(companyId: string, token: string): void {
  tokenCache.set(companyId, token);
  setString(APP_ACCOUNT_TOKEN_KEY(companyId), token);
}

/** Sync read — must not await. StoreKit has to run in the tap's call stack. */
function cachedAppAccountToken(companyId: string): string | undefined {
  const memory = tokenCache.get(companyId);
  if (memory) return memory;
  const disk = getString(APP_ACCOUNT_TOKEN_KEY(companyId));
  if (disk) {
    tokenCache.set(companyId, disk);
    return disk;
  }
  return undefined;
}

/** In-flight token fetches, so bootstrap and the first tap share one round-trip. */
const tokenRequests = new Map<string, Promise<string>>();

/** Transactions already verified this session — avoids re-posting on replay. */
const verifiedTransactions = new Set<string>();

/** Verify+finish in flight — the Apple listener and the boot drain can race. */
const settlingTransactions = new Set<string>();

let detachPurchaseListener: (() => void) | null = null;
let detachFailureListener: (() => void) | null = null;
let reconcileInFlight: Promise<void> | null = null;

/** Transactions the user started from the paywall this session. */
let userInitiatedPurchase = false;

const SHEET_WATCHDOG_MS = 6_000;
let sheetWatchdog: ReturnType<typeof setTimeout> | null = null;

function clearSheetWatchdog(): void {
  if (!sheetWatchdog) return;
  clearTimeout(sheetWatchdog);
  sheetWatchdog = null;
}

function armSheetWatchdog(planId: PlanId): void {
  clearSheetWatchdog();
  iapTrace('watchdog:arm', { planId, ms: SHEET_WATCHDOG_MS });
  sheetWatchdog = setTimeout(() => {
    sheetWatchdog = null;
    if (getFlow().phase !== 'loading') return;
    iapTrace('watchdog:fire', { planId });
    applyStoreFailure(failure('sheet_timeout', `no StoreKit event in ${SHEET_WATCHDOG_MS}ms`, 'sheet_timeout'));
  }, SHEET_WATCHDOG_MS);
}

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
  settlingTransactions.clear();
  userInitiatedPurchase = false;

  if (!detachPurchaseListener) {
    store.installListeners();

    detachPurchaseListener = store.onPurchase((purchase) => {
      void handleIncomingPurchase(purchase);
    });

    detachFailureListener = store.onPurchaseFailure((value) => {
      applyStoreFailure(value);
    });
  }

  if (companyId) {
    cachedAppAccountToken(companyId);
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
  tokenRequests.clear();
  verifiedTransactions.clear();
  settlingTransactions.clear();
  userInitiatedPurchase = false;
  clearSheetWatchdog();
  clearEntitlementRegistry();
  resetPurchaseStore();
  await clearEntitlementCaches();
  await store.disconnect();
}

async function bootstrap(companyId: string): Promise<void> {
  iapTrace('bootstrap', { companyId });
  void loadProducts();
  void reconcile(companyId);
  void appAccountToken(companyId).catch(() => undefined);

  if (!store.isStoreSupported()) {
    setStorePrepared(true);
    iapTrace('bootstrap:unsupported');
    return;
  }

  void store.connect().then((ok) => {
    iapTrace('bootstrap:connected', { ok });
    setStorePrepared(true);
  }).catch(() => {
    setStorePrepared(true);
  });

  void refreshLocalSubscriptions();
  void store.ensurePurchaseReady().then((ready) => {
    iapTrace('bootstrap:purchase-ready', { ready });
  });
  void drainPendingTransactions();
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
  const alreadyHaveCatalog = getPurchaseStoreSnapshot().products.length > 0;
  if (!alreadyHaveCatalog) setProductsLoading(true);

  if (!store.isStoreSupported()) {
    // Web / unsupported platform: dev gets a catalog to look at, production
    // gets an honest empty state.
    setProducts(isDevModeAvailable() ? devCatalog() : []);
    if (isDevModeAvailable()) setIntroEligible(true);
    setStorePrepared(true);
    return;
  }

  try {
    const products = await store.loadProducts();

    // An empty result is the normal symptom of missing store configuration; in
    // development that would leave the paywall blank and untestable.
    if (products.length === 0 && isDevModeAvailable()) {
      setProducts(devCatalog());
      setIntroEligible(true);
      setStorePrepared(true);
      return;
    }

    setProducts(products);

    if (products.length === 0) {
      setProductsError(
        'Plans are not available from the App Store yet. This usually means the ' +
          'store setup is still finishing.',
      );
      return;
    }

    const groupId =
      products.find((product) => product.subscriptionGroupIdIOS)?.subscriptionGroupIdIOS ??
      purchasablePlans()[0]?.subscriptionGroupIdIOS ??
      null;
    void store.isEligibleForIntroOffer(groupId).then(setIntroEligible).catch(() => {
      setIntroEligible(false);
    });
  } catch (error) {
    if (isDevModeAvailable()) {
      setProducts(devCatalog());
      setIntroEligible(true);
      setStorePrepared(true);
      return;
    }
    setProductsError(asPurchaseFailure(error).message);
  }
}

// ---------------------------------------------------------------------------
// Purchase
// ---------------------------------------------------------------------------

async function appAccountToken(companyId: string): Promise<string> {
  const cached = cachedAppAccountToken(companyId);
  if (cached) return cached;

  const pending = tokenRequests.get(companyId);
  if (pending) return pending;

  const request = fetchAppAccountToken(companyId)
    .then(({ appAccountToken: token }) => {
      persistAppAccountToken(companyId, token);
      return token;
    })
    .finally(() => {
      tokenRequests.delete(companyId);
    });

  tokenRequests.set(companyId, request);
  return request;
}

/**
 * Begin a purchase. StoreKit is invoked on this call stack — do not await
 * network before `store.purchase`, or iOS delays the payment sheet.
 */
export function purchase(planId: PlanId): Promise<void> {
  const companyId = activeCompanyId;
  if (!companyId) {
    setFlow({ phase: 'failed', failure: failure('unknown') });
    return Promise.resolve();
  }

  if (isFlowBusy()) return Promise.resolve();

  // With a dev scenario active there is no verification endpoint to call, so
  // the simulated path is the only one that can complete.
  if (isDevModeActive()) {
    return devSimulatePurchase(planId);
  }

  const plan = planById(planId);
  if (!plan.purchasable || !skuForPlan(plan)) {
    setFlow({ phase: 'failed', failure: failure('not_available') });
    return Promise.resolve();
  }

  // Buying while Stripe or an Enterprise contract is active would double-bill.
  const entitlement = peekEntitlement(companyId);
  if (entitlement.managedExternally) {
    setFlow({ phase: 'already_purchased' });
    return Promise.resolve();
  }

  setFlow({ phase: 'loading', planId });
  userInitiatedPurchase = true;
  lockGateIfUnpaid(companyId);
  void appAccountToken(companyId).catch(() => undefined);
  iapTraceReset('tap');
  iapTrace('purchase', {
    planId,
    sku: skuForPlan(plan),
    connected: store.isConnected(),
    token: Boolean(cachedAppAccountToken(companyId)),
  });
  armSheetWatchdog(planId);

  // Do not await `store.purchase`. Native `requestPurchase` stays pending until
  // Apple dismisses the sheet; treating that resolve as failure painted
  // "not available" over a completed yearly purchase. Never await connect here.
  void store.purchase(plan, cachedAppAccountToken(companyId)).catch((error) => {
    applyStoreFailure(asPurchaseFailure(error));
  });
  return Promise.resolve();
}

function lockGateIfUnpaid(companyId: string | null): void {
  if (isPaywallBypassed()) return;
  if (peekEntitlement(companyId).isActive) return;
  setGateCelebrationLock(true);
}

/**
 * StoreKit often emits an error *and* a transaction for the same tap (sheet
 * dismissed, then the JWS arrives). Never let the error overwrite a purchase
 * that is already verifying or finished.
 */
function applyStoreFailure(value: PurchaseFailure): void {
  const phase = getFlow().phase;
  iapTrace('failure', { phase, code: value.code, cause: value.cause });
  if (
    phase === 'verifying' ||
    phase === 'success' ||
    phase === 'pending' ||
    phase === 'restoring' ||
    phase === 'restored'
  ) {
    return;
  }
  if (phase !== 'loading') return;

  if (isCancellation(value)) {
    clearSheetWatchdog();
    userInitiatedPurchase = false;
    store.abortPurchaseInFlight();
    setFlow({ phase: 'cancelled' });
    return;
  }
  if (value.code === 'already_owned') {
    clearSheetWatchdog();
    userInitiatedPurchase = false;
    store.abortPurchaseInFlight();
    setFlow({ phase: 'already_purchased' });
    return;
  }
  // OpenIAP emits QueryProduct / "not available" / a generic failure *and then*
  // delivers the transaction. A banner here is a one-second lie — drop it.
  // A real hang still fails via the sheet watchdog.
  if (isInFlightGhostError(value)) {
    iapTrace('failure:ignored', { code: value.code, cause: value.cause });
    return;
  }

  clearSheetWatchdog();
  store.abortPurchaseInFlight();
  if (value.code === 'sheet_timeout') {
    setFlow({ phase: 'failed', failure: value });
    return;
  }

  userInitiatedPurchase = false;
  setFlow({ phase: 'failed', failure: value });
}

/**
 * Handle a transaction from the StoreKit queue — a fresh purchase, a renewal,
 * an Ask-to-Buy approval, or one replayed after a crash.
 */
async function handleIncomingPurchase(purchaseValue: store.Purchase): Promise<void> {
  const companyId = activeCompanyId;
  if (!companyId) return;

  clearSheetWatchdog();
  const plan = planForSku(purchaseValue.productId);
  const planId: PlanId = plan?.id ?? 'pro_monthly';
  iapTrace('incoming', {
    id: purchaseValue.id,
    sku: purchaseValue.productId,
    state: purchaseValue.purchaseState,
    planId,
  });

  // A deferred purchase carries no entitlement yet; it converts later and comes
  // back through this same listener.
  if (purchaseValue.purchaseState === 'pending') {
    setFlow({ phase: 'pending', planId });
    return;
  }

  if (verifiedTransactions.has(purchaseValue.id)) return;
  if (settlingTransactions.has(purchaseValue.id)) return;
  settlingTransactions.add(purchaseValue.id);

  const flow = getFlow();
  const shouldCelebrate =
    userInitiatedPurchase ||
    flow.phase === 'loading' ||
    flow.phase === 'verifying' ||
    flow.phase === 'failed' ||
    flow.phase === 'cancelled';

  // StoreKit already charged (or started the trial). Flow first, then Pro —
  // the gate must see `success` before `isPro`, or it unmounts the paywall.
  if (shouldCelebrate) {
    userInitiatedPurchase = false;
    lockGateIfUnpaid(companyId);
    setFlow({ phase: 'success', planId });
    setIntroEligible(false);
    setOptimisticEntitlement(optimisticAppleEntitlement(companyId, planId));
    iapTrace('success', { planId, sku: purchaseValue.productId });
  }

  void settleIncomingPurchase(purchaseValue, planId, companyId);
}

async function settleIncomingPurchase(
  purchaseValue: store.Purchase,
  planId: PlanId,
  companyId: string,
): Promise<void> {
  try {
    const token = tokenCache.get(companyId) ?? null;
    const jws = await store.verifiedPurchaseToken(purchaseValue);
    if (!jws) {
      iapTrace('verify:no-jws', { transactionId: purchaseValue.id });
      return;
    }

    // Finish before the server round-trip. Unfinished StoreKit transactions
    // in the same subscription group block the next monthly/yearly sheet.
    verifiedTransactions.add(purchaseValue.id);
    await store.finish(purchaseValue).catch(() => undefined);
    iapTrace('finish', { transactionId: purchaseValue.id });

    iapTrace('verify:start', { transactionId: purchaseValue.id });
    const response = await verifyApplePurchase({
      companyId,
      transactionId: purchaseValue.id,
      jws,
      productId: purchaseValue.productId,
      appAccountToken: token,
    });
    iapTrace('verify:done', { accepted: response.accepted, reason: response.reason });

    if (!response.accepted) {
      const value = response.reason
        ? REJECTION_FAILURE[response.reason]
        : failure('verification_failed');
      // Only yank a completed Apple purchase for a workspace conflict.
      // Transient verify failures must not replace the celebration with
      // "not available" / "couldn't verify".
      if (
        response.reason === 'bound_to_other_company' ||
        response.reason === 'superseded_by_stripe'
      ) {
        setOptimisticEntitlement(null);
        setGateCelebrationLock(false);
        setFlow({ phase: 'failed', failure: value });
      }
      return;
    }

    await refreshLocalSubscriptions();
  } catch {
    // Keep celebration. Retry verify on the next reconcile.
  } finally {
    settlingTransactions.delete(purchaseValue.id);
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
      transactions: await Promise.all(
        purchases.map(async (item) => ({
          transactionId: item.id,
          jws: (await store.verifiedPurchaseToken(item)) ?? item.purchaseToken ?? null,
          productId: item.productId,
        })),
      ),
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

    const planId = (planForSku(purchases[0].productId)?.id ?? 'pro_monthly') as PlanId;
    lockGateIfUnpaid(companyId);
    setFlow({ phase: 'restored', planId });
    setOptimisticEntitlement(optimisticAppleEntitlement(companyId, planId));
    setIntroEligible(false);

    void (async () => {
      for (const item of purchases) {
        verifiedTransactions.add(item.id);
        await store.finish(item).catch(() => undefined);
      }
      await refreshLocalSubscriptions().catch(() => undefined);
    })();

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

/** Publish StoreKit 2 `Transaction.currentEntitlements` into the resolver. */
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

/** Apple's native manage sheet. We never build our own cancel button. */
export async function openManageSubscriptions(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  await store.openNativeManageSubscriptions();
}

export function resetFlow(): void {
  userInitiatedPurchase = false;
  clearSheetWatchdog();
  setGateCelebrationLock(false);
  setFlow({ phase: 'idle' });
}

/** Prime StoreKit's subscription product cache for this plan (call on plan select). */
export function warmPlan(planId: PlanId): Promise<boolean> {
  const sku = skuForPlan(planById(planId));
  if (!sku) return Promise.resolve(false);
  iapTrace('warmPlan', { planId, sku });
  return store.warmSubscriptionSku(sku).then((ok) => {
    const cached = store.cachedProduct(sku);
    if (cached) upsertProduct(cached);
    iapTrace('warmPlan:done', { planId, sku, ok, cached: Boolean(cached) });
    return ok;
  });
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
 * Run a purchase without StoreKit or the server. Same instant-success path
 * as a real StoreKit transaction — celebration, not a fake verifying spinner.
 */
export async function devSimulatePurchase(planId: PlanId): Promise<void> {
  if (!isDevModeAvailable()) return;

  const companyId = activeCompanyId;
  lockGateIfUnpaid(companyId);
  setFlow({ phase: 'success', planId });
  setIntroEligible(false);
  if (companyId) {
    setOptimisticEntitlement(optimisticAppleEntitlement(companyId, planId));
  }
  setDevScenario(scenarioForPlan(planId));
}

/** Simulated restore, including the "nothing to restore" branch. */
export async function devSimulateRestore(): Promise<void> {
  if (!isDevModeAvailable()) return;

  setFlow({ phase: 'restoring' });
  await delay(900);

  lockGateIfUnpaid(activeCompanyId);
  setFlow({ phase: 'restored', planId: 'pro_monthly' });
  if (activeCompanyId) {
    setOptimisticEntitlement(optimisticAppleEntitlement(activeCompanyId, 'pro_monthly'));
  }
  setDevScenario('pro_monthly');
}

/** Every plan the dev panel can offer, for building its buttons. */
export function devPurchasablePlanIds(): PlanId[] {
  return Object.values(PLANS)
    .filter((plan) => plan.purchasable)
    .map((plan) => plan.id);
}
