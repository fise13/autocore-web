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
import { failure, toPurchaseFailure } from './purchase-errors';
import type { IntroOffer, PurchaseFailure, StoreProduct } from './types';

type PurchaseHandler = (purchase: Purchase) => void;
type FailureHandler = (value: PurchaseFailure) => void;

const isSupportedPlatform = Platform.OS === 'ios' || Platform.OS === 'android';

let connected = false;
let connecting: Promise<boolean> | null = null;
let listenersInstalled = false;
let purchaseSubscription: { remove(): void } | null = null;
let errorSubscription: { remove(): void } | null = null;
let appStateSubscription: NativeEventSubscription | null = null;

const purchaseHandlers = new Set<PurchaseHandler>();
const failureHandlers = new Set<FailureHandler>();

/** Cached normalized products, keyed by SKU. Cleared on sign-out. */
const productCache = new Map<string, StoreProduct>();

function emitPurchase(purchase: Purchase): void {
  for (const handler of purchaseHandlers) handler(purchase);
}

function emitFailure(value: PurchaseFailure): void {
  for (const handler of failureHandlers) handler(value);
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

  // A backgrounded app can have its store connection torn down; reconnect so
  // the first purchase after resume does not fail with `not_connected`.
  appStateSubscription = AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state === 'active' && !connected) {
      void connect().catch(() => undefined);
    }
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

  connecting = initConnection()
    .then((result) => {
      connected = result;
      return result;
    })
    .catch(() => {
      connected = false;
      return false;
    })
    .finally(() => {
      connecting = null;
    });

  return connecting;
}

export async function disconnect(): Promise<void> {
  productCache.clear();
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

function periodUnit(value: string | null | undefined): IntroOffer['periodUnit'] | null {
  switch (value) {
    case 'day':
    case 'week':
    case 'month':
    case 'year':
      return value;
    default:
      return null;
  }
}

function readIntroOffer(product: ProductSubscription): IntroOffer | null {
  // Preferred: the cross-platform normalized offer list.
  const offer = product.subscriptionOffers?.find((entry) => entry.type === 'introductory');
  if (offer) {
    const unit = periodUnit(offer.period?.unit);
    if (unit) {
      return {
        displayPrice: offer.displayPrice,
        periodCount: offer.periodCount ?? 1,
        periodUnit: unit,
        isFreeTrial: offer.paymentMode === 'free-trial' || offer.price === 0,
      };
    }
  }

  // Fallback: iOS-specific introductory fields.
  if (product.platform === 'ios') {
    const unit = periodUnit(product.introductoryPriceSubscriptionPeriodIOS);
    if (unit && product.introductoryPriceIOS) {
      const periods = Number(product.introductoryPriceNumberOfPeriodsIOS ?? '1');
      return {
        displayPrice: product.introductoryPriceIOS,
        periodCount: Number.isFinite(periods) && periods > 0 ? periods : 1,
        periodUnit: unit,
        isFreeTrial: product.introductoryPricePaymentModeIOS === 'free-trial',
      };
    }
  }

  return null;
}

function normalizeProduct(product: Product | ProductSubscription): StoreProduct | null {
  const plan = planForSku(product.id);
  if (!plan) return null;

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
    introOffer: product.type === 'subs' ? readIntroOffer(product as ProductSubscription) : null,
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
  const skus = allStoreSkus();
  if (skus.length === 0) return [];

  if (!(await connect())) {
    throw failure('not_connected');
  }

  try {
    const result = await fetchProducts({ skus, type: 'subs' });
    const items = Array.isArray(result) ? result : [];

    const normalized = items
      .map((item) => normalizeProduct(item))
      .filter((item): item is StoreProduct => item !== null);

    for (const product of normalized) {
      productCache.set(product.sku, product);
    }

    return normalized;
  } catch (error) {
    throw toPurchaseFailure(error);
  }
}

export function cachedProduct(sku: string): StoreProduct | null {
  return productCache.get(sku) ?? null;
}

/**
 * Whether the Apple ID is eligible for the introductory offer on this plan's
 * subscription group. Apple decides this, not us — a returning subscriber is
 * ineligible and must never be shown a "free trial" button.
 */
export async function isEligibleForIntroOffer(plan: PlanDescriptor): Promise<boolean> {
  if (Platform.OS !== 'ios' || !plan.subscriptionGroupIdIOS) return false;
  if (!(await connect())) return false;
  try {
    return await isEligibleForIntroOfferIOS(plan.subscriptionGroupIdIOS);
  } catch {
    // Eligibility is an optimization; never block the paywall on it.
    return false;
  }
}

// ---------------------------------------------------------------------------
// Purchase
// ---------------------------------------------------------------------------

/**
 * Start a purchase. The **result arrives through `onPurchase`**, not the return
 * value — StoreKit is event-based and a resolved promise here only means the
 * request was dispatched.
 *
 * `appAccountToken` binds the transaction to a (user, company) pair so the
 * server can tell which workspace a receipt belongs to.
 */
export async function purchase(plan: PlanDescriptor, appAccountToken: string): Promise<void> {
  const sku = skuForPlan(plan);
  if (!sku) throw failure('not_available');

  if (!(await connect())) {
    throw failure('not_connected');
  }

  try {
    await requestPurchase({
      type: 'subs',
      request: {
        apple: {
          sku,
          appAccountToken,
          // We finish the transaction ourselves, only after the server has
          // verified it. Auto-finishing would drop unverified purchases.
          andDangerouslyFinishTransactionAutomatically: false,
        },
        google: {
          skus: [sku],
        },
      },
    });
  } catch (error) {
    throw toPurchaseFailure(error);
  }
}

/** Finalize a transaction. Call only after server-side verification succeeds. */
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

/** What StoreKit itself believes is active on this device, right now. */
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
