/**
 * Purchase UI store — L4.
 *
 * Global (not company-scoped) state for the paywall: the store catalog, intro
 * offer eligibility, and the purchase flow state machine. Separate from the
 * entitlement registry because a product list is a property of the device's
 * storefront, not of the workspace.
 */
import type { PurchaseFlowState, StoreProduct } from './types';

export type PurchaseStoreSnapshot = {
  products: StoreProduct[];
  productsLoading: boolean;
  productsError: string | null;
  /** Apple ID is eligible for the introductory offer (free trial). */
  introEligible: boolean;
  flow: PurchaseFlowState;
  /**
   * Gate paywall stays mounted through celebration. Set when a purchase starts
   * from the unpaid gate (not a modal over an already-open app).
   */
  gateCelebrationLock: boolean;
  /**
   * Native store is connected. The purchase CTA can enable once this is true
   * or the selected SKU is already in the product cache — do not wait for the
   * full catalog.
   */
  storePrepared: boolean;
};

const EMPTY_PRODUCTS: StoreProduct[] = [];

let snapshot: PurchaseStoreSnapshot = {
  products: EMPTY_PRODUCTS,
  productsLoading: false,
  productsError: null,
  introEligible: false,
  flow: { phase: 'idle' },
  gateCelebrationLock: false,
  storePrepared: false,
};

const listeners = new Set<() => void>();

function emit(next: Partial<PurchaseStoreSnapshot>): void {
  snapshot = { ...snapshot, ...next };
  for (const listener of listeners) listener();
}

export function subscribePurchaseStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getPurchaseStoreSnapshot(): PurchaseStoreSnapshot {
  return snapshot;
}

export function setProductsLoading(loading: boolean): void {
  emit({ productsLoading: loading, ...(loading ? { productsError: null } : null) });
}

export function setProducts(products: StoreProduct[]): void {
  emit({ products, productsLoading: false, productsError: null });
}

/** Merge one warmed SKU into the catalog so the paywall CTA can enable before the full list returns. */
export function upsertProduct(product: StoreProduct): void {
  const existing = snapshot.products;
  const index = existing.findIndex(
    (item) => item.sku === product.sku || item.planId === product.planId,
  );
  if (index === -1) {
    setProducts([...existing, product]);
    return;
  }
  const next = existing.slice();
  next[index] = product;
  setProducts(next);
}

export function setProductsError(message: string): void {
  emit({ productsError: message, productsLoading: false });
}

export function setIntroEligible(eligible: boolean): void {
  if (snapshot.introEligible === eligible) return;
  emit({ introEligible: eligible });
}

export function setGateCelebrationLock(locked: boolean): void {
  if (snapshot.gateCelebrationLock === locked) return;
  emit({ gateCelebrationLock: locked });
}

export function setStorePrepared(prepared: boolean): void {
  if (snapshot.storePrepared === prepared) return;
  emit({ storePrepared: prepared });
}

export function setFlow(flow: PurchaseFlowState): void {
  // Phase-only comparison is enough: every payload-carrying phase is keyed by a
  // planId or failure that changes with it, and re-emitting the same terminal
  // state would restart the success animation.
  if (snapshot.flow.phase === flow.phase && flow.phase === 'idle') return;
  if (snapshot.flow === flow) return;
  emit({ flow });
}

export function getFlow(): PurchaseFlowState {
  return snapshot.flow;
}

/** True while a store request is in flight — blocks double-taps on the CTA. */
export function isFlowBusy(): boolean {
  const phase = snapshot.flow.phase;
  return phase === 'loading' || phase === 'verifying' || phase === 'restoring';
}

/** StoreKit accepted — the paywall stays up for the celebration, not a spinner. */
export function isCelebratingPurchasePhase(phase: PurchaseFlowState['phase']): boolean {
  return phase === 'success' || phase === 'restored';
}

export function resetPurchaseStore(): void {
  snapshot = {
    products: EMPTY_PRODUCTS,
    productsLoading: false,
    productsError: null,
    introEligible: false,
    flow: { phase: 'idle' },
    gateCelebrationLock: false,
    storePrepared: false,
  };
  for (const listener of listeners) listener();
}
