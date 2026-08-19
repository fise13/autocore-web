/**
 * PurchaseManager — L1. The only module in the app that imports `react-native-iap`.
 *
 * Everything above this file speaks in `StoreProduct` / `PurchaseFailure` and
 * never sees a StoreKit type, so the store SDK can be mocked in tests and
 * stubbed on web without a single `Platform.OS` branch upstream.
 *
 * It owns the connection, the product catalog and the transaction queue. It
 * owns nothing about entitlement — that is the SubscriptionManager's job.
 */
import { AppState, Platform, type AppStateStatus, type NativeEventSubscription } from 'react-native';
import {
  endConnection,
  fetchProducts,
  finishTransaction,
  getActiveSubscriptions,
  getAvailablePurchases,
  getTransactionJwsIOS,
  initConnection,
  isEligibleForIntroOfferIOS,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  showManageSubscriptionsIOS,
  syncIOS,
  type ActiveSubscription,
  type Product,
  type ProductSubscription,
  type Purchase,
} from 'react-native-iap';

import { allStoreSkus, planForSku, skuForPlan, type PlanDescriptor } from './catalog';
import {
  readIntroOfferFromProduct,
  readSubscriptionGroupId,
  type RawStoreProduct,
} from './intro-offer';
import { failure, isInFlightGhostError, toPurchaseFailure } from './purchase-errors';
import { iapTrace } from './iap-trace';
import type { PurchaseFailure, StoreProduct } from './types';

type PurchaseHandler = (purchase: Purchase) => void;
type FailureHandler = (value: PurchaseFailure) => void;

const isSupportedPlatform = Platform.OS === 'ios' || Platform.OS === 'android';

let connected = false;
let connecting: Promise<boolean> | null = null;
let purchaseReady = false;
let preparingPurchase: Promise<boolean> | null = null;
/** True between a user tap and the matching StoreKit event. Blocks catalog refetches. */
let purchaseInFlight = false;
let listenersInstalled = false;
let purchaseSubscription: { remove(): void } | null = null;
let errorSubscription: { remove(): void } | null = null;
let appStateSubscription: NativeEventSubscription | null = null;

const purchaseHandlers = new Set<PurchaseHandler>();
const failureHandlers = new Set<FailureHandler>();

/** Cached normalized products, keyed by SKU. Cleared on sign-out. */
const productCache = new Map<string, StoreProduct>();

/** SKUs last fetched as `subs` this connection — native `productTypeBySku` is primed. */
const warmedSkus = new Set<string>();

/** Apple requires a UUID; anything else makes StoreKit skip the token or fail oddly. */
const APP_ACCOUNT_TOKEN_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function rememberFetchedSkus(ids: readonly string[]): void {
  for (const id of ids) warmedSkus.add(id);
}

async function warmSubscriptionCatalog(): Promise<void> {
  const skus = allStoreSkus();
  if (skus.length === 0 || !connected || purchaseInFlight) return;
  try {
    const result = await fetchProducts({ skus, type: 'subs' });
    const items = Array.isArray(result) ? result : [];
    rememberFetchedSkus(items.map((item) => item.id));
    for (const item of items) {
      const normalized = normalizeProduct(item);
      if (normalized) productCache.set(normalized.sku, normalized);
    }
  } catch {
    // Next tap / foreground retries. Never throw into AppState.
  }
}

/**
 * Fetch this subscription SKU as `subs` so OpenIAP records `productTypeBySku`
 * as a subscription. A cache miss at purchase time falls through to
 * `Product.products(for:)` which, for monthly, often never returns in sandbox.
 */
export async function warmSubscriptionSku(sku: string): Promise<boolean> {
  if (!sku || !isSupportedPlatform) return false;
  if (purchaseInFlight) {
    iapTrace('warm:skip-in-flight', { sku, warmed: warmedSkus.has(sku) });
    return warmedSkus.has(sku);
  }
  if (warmedSkus.has(sku) && connected) {
    iapTrace('warm:cached', { sku });
    return true;
  }
  iapTrace('warm:start', { sku });
  if (!(await connect())) {
    iapTrace('warm:connect-failed', { sku });
    return false;
  }
  if (purchaseInFlight) return warmedSkus.has(sku);
  try {
    const result = await fetchProducts({ skus: [sku], type: 'subs' });
    const items = Array.isArray(result) ? result : [];
    rememberFetchedSkus(items.map((item) => item.id));
    for (const item of items) {
      const normalized = normalizeProduct(item);
      if (normalized) productCache.set(normalized.sku, normalized);
    }
    const ok = items.some((item) => item.id === sku);
    iapTrace('warm:done', { sku, ok, count: items.length });
    return ok;
  } catch (error) {
    iapTrace('warm:error', { sku, message: error instanceof Error ? error.message : String(error) });
    return warmedSkus.has(sku);
  }
}

export function isPurchaseInFlight(): boolean {
  return purchaseInFlight;
}

export function isSubscriptionSkuWarmed(sku: string): boolean {
  return warmedSkus.has(sku);
}

export function warmedSubscriptionSkus(): string[] {
  return Array.from(warmedSkus);
}

/**
 * Connect and cache every subscription SKU so `requestPurchase` hits StoreKit's
 * product cache on the tap's call stack.
 *
 * Do not finish transactions here. Blind `finishTransaction` on every restorable
 * purchase races the yearly/monthly listener and can stall for minutes in sandbox.
 */
export async function ensurePurchaseReady(): Promise<boolean> {
  if (!isSupportedPlatform) return false;
  if (purchaseReady && connected) return true;
  if (preparingPurchase) return preparingPurchase;

  preparingPurchase = (async () => {
    iapTrace('ensureReady:start');
    if (!(await connect())) {
      iapTrace('ensureReady:connect-failed');
      return false;
    }
    await warmSubscriptionCatalog();
    purchaseReady = true;
    iapTrace('ensureReady:done', { warmed: warmedSubscriptionSkus() });
    return true;
  })()
    .catch(() => false)
    .finally(() => {
      preparingPurchase = null;
    });

  return preparingPurchase;
}

function emitPurchase(purchase: Purchase): void {
  purchaseInFlight = false;
  iapTrace('listener:purchase', {
    id: purchase.id,
    sku: purchase.productId,
    state: purchase.purchaseState,
  });
  for (const handler of purchaseHandlers) handler(purchase);
}

function emitFailure(value: PurchaseFailure): void {
  const ghost = isInFlightGhostError(value);
  if (!ghost) {
    purchaseInFlight = false;
  }
  iapTrace('listener:error', {
    code: value.code,
    cause: value.cause,
    debug: value.debugMessage,
    ignored: ghost,
  });
  for (const handler of failureHandlers) handler(value);
}

/** Call when a buy is abandoned (cancel / real failure) so catalog fetches may resume. */
export function abortPurchaseInFlight(): void {
  purchaseInFlight = false;
}

/**
 * Register the transaction-queue listeners.
 *
 * Must run at app start, **before any UI mounts** — StoreKit replays
 * interrupted, Ask-to-Buy and renewal transactions immediately on connect, and
 * anything not observed here is silently dropped until the next launch.
 */
export function installListeners(): void {
  if (listenersInstalled || !isSupportedPlatform) return;
  listenersInstalled = true;

  // Attaching touches the Nitro hybrid object. The library swallows only the
  // exact "Nitro runtime not installed" message and rethrows anything else, so
  // a JS bundle running on a binary built before `react-native-iap` was added
  // would crash here at mount. Degrade to "no store" instead — every caller
  // already handles an unavailable store.
  try {
    // StoreKit 2 `Transaction.updates` — purchases, renewals, Ask-to-Buy, refunds.
    purchaseSubscription = purchaseUpdatedListener((purchase) => {
      emitPurchase(purchase);
    });

    errorSubscription = purchaseErrorListener((error) => {
      emitFailure(toPurchaseFailure(error));
    });
  } catch {
    purchaseSubscription = null;
    errorSubscription = null;
  }

  // Warm the store and clear unfinished transactions before the paywall tap.
  // `Product.purchase` must run in the same call stack as the press.
  void ensurePurchaseReady();

  // A backgrounded app can have its store connection torn down; reconnect and
  // re-fetch SKUs so the next tap hits StoreKit's product cache, not a live
  // `Product.products(for:)` round-trip that hangs in sandbox for minutes.
  appStateSubscription = AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state !== 'active') return;
    // Returning from Apple's sheet sets `active`. Do not fetchProducts here —
    // that round-trip hangs in sandbox and OpenIAP emits QueryProduct onto the
    // purchase error listener, which we used to surface as "not available".
    if (purchaseInFlight) return;
    if (connected) return;
    purchaseReady = false;
    void ensurePurchaseReady().catch(() => undefined);
  });
}

export function onPurchase(handler: PurchaseHandler): () => void {
  purchaseHandlers.add(handler);
  return () => purchaseHandlers.delete(handler);
}

export function onPurchaseFailure(handler: FailureHandler): () => void {
  failureHandlers.add(handler);
  return () => failureHandlers.delete(handler);
}

export function isStoreSupported(): boolean {
  return isSupportedPlatform;
}

export function isConnected(): boolean {
  return connected;
}

/** Idempotent, single-flight store connection. */
export async function connect(): Promise<boolean> {
  if (!isSupportedPlatform) return false;
  if (connected) return true;
  if (connecting) return connecting;

  iapTrace('connect:start');

  connecting = initConnection()
    .then((result) => {
      connected = result;
      iapTrace('connect:done', { ok: result });
      return result;
    })
    .catch((error) => {
      connected = false;
      iapTrace('connect:error', { message: error instanceof Error ? error.message : String(error) });
      return false;
    })
    .finally(() => {
      connecting = null;
    });

  return connecting;
}

export async function disconnect(): Promise<void> {
  productCache.clear();
  warmedSkus.clear();
  purchaseReady = false;
  purchaseInFlight = false;
  if (!connected) return;
  try {
    await endConnection();
  } catch {
    // Disconnecting is best-effort; the process may already be tearing down.
  } finally {
    connected = false;
  }
}

/** Full teardown — sign-out only. Listeners are re-installed on next boot. */
export function teardown(): void {
  purchaseSubscription?.remove();
  errorSubscription?.remove();
  appStateSubscription?.remove();
  purchaseSubscription = null;
  errorSubscription = null;
  appStateSubscription = null;
  listenersInstalled = false;
  purchaseHandlers.clear();
  failureHandlers.clear();
  void disconnect();
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

function asRawProduct(product: Product | ProductSubscription): RawStoreProduct {
  return product as unknown as RawStoreProduct;
}

function normalizeProduct(product: Product | ProductSubscription): StoreProduct | null {
  const plan = planForSku(product.id);
  if (!plan) return null;

  const raw = asRawProduct(product);

  return {
    planId: plan.id,
    sku: product.id,
    // Store-formatted and already localized to the user's storefront. The app
    // must never build a price string itself.
    displayPrice: product.displayPrice,
    priceAmount: typeof product.price === 'number' ? product.price : null,
    currency: product.currency,
    title: product.title,
    description: product.description,
    interval: plan.interval,
    introOffer: product.type === 'subs' ? readIntroOfferFromProduct(raw) : null,
    subscriptionGroupIdIOS: readSubscriptionGroupId(raw) ?? plan.subscriptionGroupIdIOS,
  };
}

/**
 * Load every known subscription SKU from the store.
 *
 * Prices, currency and offer terms always come from here — nothing about
 * pricing is hardcoded anywhere in the app.
 */
export async function loadProducts(): Promise<StoreProduct[]> {
  if (!isSupportedPlatform) return [];
  if (purchaseInFlight) return Array.from(productCache.values());
  const skus = allStoreSkus();
  if (skus.length === 0) return [];

  if (!(await connect())) {
    throw failure('not_connected');
  }

  try {
    iapTrace('catalog:start', { skus: skus.length });
    const result = await fetchProducts({ skus, type: 'subs' });
    if (purchaseInFlight) return Array.from(productCache.values());

    const items = Array.isArray(result) ? result : [];

    const normalized = items
      .map((item) => normalizeProduct(item))
      .filter((item): item is StoreProduct => item !== null);

    for (const product of normalized) {
      productCache.set(product.sku, product);
      warmedSkus.add(product.sku);
    }

    iapTrace('catalog:done', { count: normalized.length, skus: normalized.map((item) => item.sku) });
    return normalized;
  } catch (error) {
    iapTrace('catalog:error', { message: error instanceof Error ? error.message : String(error) });
    throw toPurchaseFailure(error);
  }
}

export function cachedProduct(sku: string): StoreProduct | null {
  return productCache.get(sku) ?? null;
}

/**
 * Whether this Apple ID may still use the introductory offer on the AutoCore
 * Pro group — StoreKit 2 `Product.SubscriptionInfo.isEligibleForIntroOffer`.
 *
 * One intro per Apple ID per group: monthly and yearly share it. Returning
 * `false` on failure so the paywall never flashes a trial Apple will refuse.
 */
export async function isEligibleForIntroOffer(groupId: string | null): Promise<boolean> {
  if (Platform.OS !== 'ios' || !groupId) return false;
  if (!(await connect())) return false;
  try {
    return await isEligibleForIntroOfferIOS(groupId);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Purchase
// ---------------------------------------------------------------------------

/**
 * Start a purchase. The **result arrives through `onPurchase` / `onPurchaseFailure`**,
 * not this promise. `requestPurchase` stays pending until Apple dismisses the
 * sheet — awaiting it keeps the paywall spinning after a successful yearly buy.
 *
 * Dispatch on this call stack. Do not await connect/fetch/finish here.
 */
export function purchase(plan: PlanDescriptor, appAccountToken?: string | null): Promise<void> {
  const sku = skuForPlan(plan);
  if (!sku) return Promise.reject(failure('not_available'));

  const apple: {
    sku: string;
    appAccountToken?: string;
  } = { sku };
  if (appAccountToken && APP_ACCOUNT_TOKEN_UUID.test(appAccountToken)) {
    apple.appAccountToken = appAccountToken;
  }

  const dispatch = (): void => {
    purchaseInFlight = true;
    iapTrace('requestPurchase', { sku, hasToken: Boolean(apple.appAccountToken) });
    void requestPurchase({
      type: 'subs',
      request: { apple },
    }).catch((error) => {
      iapTrace('requestPurchase:catch', {
        sku,
        message: error instanceof Error ? error.message : String(error),
        code: typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: unknown }).code) : undefined,
      });
      emitFailure(toPurchaseFailure(error));
    });
  };

  if (connected) {
    iapTrace('purchase:dispatch', { sku });
    dispatch();
    return Promise.resolve();
  }

  iapTrace('purchase:connect-then-dispatch', { sku });
  void connect().then((ok) => {
    if (!ok) {
      emitFailure(failure('not_connected'));
      return;
    }
    dispatch();
  });
  return Promise.resolve();
}

/**
 * StoreKit 2 `Transaction.VerificationResult` plus the signed JWS.
 *
 * The JWS is what the server re-fetches from Apple. `isTransactionVerifiedIOS`
 * returning false must not drop a transaction that still carries a token —
 * sandbox and some library versions report that helper incorrectly, which
 * left the paywall on a false "couldn't be completed".
 */
export async function verifiedPurchaseToken(purchase: Purchase): Promise<string | null> {
  if (Platform.OS !== 'ios') return purchase.purchaseToken ?? null;

  const attached = purchase.purchaseToken ?? null;
  if (attached) return attached;

  try {
    return (await getTransactionJwsIOS(purchase.productId)) ?? null;
  } catch {
    return null;
  }
}

/** Finalize a transaction so StoreKit will present the next sheet. */
export async function finish(value: Purchase): Promise<void> {
  try {
    await finishTransaction({ purchase: value, isConsumable: false });
  } catch (error) {
    // A failed finish is not user-facing: StoreKit replays the transaction on
    // the next launch and the drain loop will retry it.
    throw toPurchaseFailure(error);
  }
}

/** Unfinished + restorable purchases held by this Apple ID. */
export async function listPurchases(activeOnly = true): Promise<Purchase[]> {
  if (!isSupportedPlatform) return [];
  if (!(await connect())) throw failure('not_connected');

  try {
    return await getAvailablePurchases({
      onlyIncludeActiveItemsIOS: activeOnly,
      alsoPublishToEventListenerIOS: false,
    });
  } catch (error) {
    throw toPurchaseFailure(error);
  }
}

/** StoreKit 2 `Transaction.currentEntitlements` for our known SKUs. */
export async function listActiveSubscriptions(): Promise<ActiveSubscription[]> {
  if (!isSupportedPlatform) return [];
  if (!(await connect())) return [];

  try {
    return await getActiveSubscriptions(allStoreSkus());
  } catch {
    // Offline fallback path — never throw into entitlement resolution.
    return [];
  }
}

/** Force StoreKit to refresh from Apple's servers. Restore flow only. */
export async function sync(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  if (!(await connect())) return;
  try {
    await syncIOS();
  } catch {
    // `syncIOS` prompts for an Apple ID password and can be cancelled; the
    // restore continues with whatever the local receipt already holds.
  }
}

/** Apple's native manage-subscription sheet. We never build our own cancel UI. */
export async function openNativeManageSubscriptions(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    await showManageSubscriptionsIOS();
  } catch (error) {
    throw toPurchaseFailure(error);
  }
}

export type { ActiveSubscription, Purchase };
