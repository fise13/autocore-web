import { useCallback, useMemo, useSyncExternalStore } from 'react';

import { useEntitlement } from '@/hooks/use-entitlement';
import { useSession } from '@/hooks/use-session';
import { purchasablePlans, type PlanDescriptor } from '@/lib/subscriptions/catalog';
import {
  getPurchaseStoreSnapshot,
  subscribePurchaseStore,
} from '@/lib/subscriptions/purchase-store';
import {
  hasFailedVerification,
  permanentVerificationFailure,
  subscribePendingVerification,
} from '@/lib/subscriptions/pending-verification';
import * as manager from '@/lib/subscriptions/subscription-manager';
import { resolveTrialOffer, type TrialOffer } from '@/lib/subscriptions/trial-policy';
import type {
  Entitlement,
  PlanId,
  PurchaseFlowState,
  RestoreOutcome,
  StoreProduct,
} from '@/lib/subscriptions/types';

export type PlanOffer = {
  plan: PlanDescriptor;
  /** Null until the store answers — the CTA stays disabled until then. */
  product: StoreProduct | null;
};

export type UseSubscriptionResult = {
  entitlement: Entitlement;
  isPro: boolean;
  isLoading: boolean;
  /** Purchasable plans paired with their live store product. */
  offers: PlanOffer[];
  productsLoading: boolean;
  productsError: string | null;
  flow: PurchaseFlowState;
  /** Apple ID may still use the introductory offer on this subscription group. */
  introEligible: boolean;
  trial: TrialOffer;
  /** Owner or admin — anyone else sees an explanation instead of a CTA. */
  canManageBilling: boolean;
  /**
   * A purchase from this device is paid but not recorded by the server yet.
   * The UI must acknowledge the payment rather than showing a plain paywall.
   */
  hasUnconfirmedPurchase: boolean;
  /**
   * Set when retrying cannot help — the server has no App Store credentials, or
   * this seat may not manage billing. The banner has to say so instead of
   * promising an automatic recovery that will never arrive.
   */
  unconfirmedReason: 'server_unconfigured' | 'permission_denied' | null;
  purchase: (planId: PlanId) => Promise<void>;
  restore: (options?: { transfer?: boolean }) => Promise<RestoreOutcome>;
  openManage: () => Promise<void>;
  refresh: () => Promise<void>;
  reloadProducts: () => Promise<void>;
  resetFlow: () => void;
  warmPlan: (planId: PlanId) => Promise<boolean>;
  /** Native StoreKit is connected, or the selected SKU is already cached. */
  storePrepared: boolean;
};

/**
 * Everything the paywall and the manage screen need, in one hook.
 *
 * Reads two stores — the company-scoped entitlement registry and the global
 * purchase store — so a plan change re-renders only what subscribes here.
 */
export function useSubscription(): UseSubscriptionResult {
  const { companyId, profile } = useSession();
  const { entitlement, isLoading } = useEntitlement();

  const purchaseState = useSyncExternalStore(
    subscribePurchaseStore,
    getPurchaseStoreSnapshot,
    getPurchaseStoreSnapshot,
  );

  const offers = useMemo<PlanOffer[]>(
    () =>
      (purchasablePlans() ?? []).map((plan) => ({
        plan,
        product: (purchaseState.products ?? []).find((product) => product.planId === plan.id) ?? null,
      })),
    [purchaseState.products],
  );

  const trial = useMemo<TrialOffer>(
    () =>
      resolveTrialOffer({
        entitlement,
        product: offers.find((offer) => offer.product !== null)?.product ?? null,
        introEligible: purchaseState.introEligible,
      }),
    [entitlement, offers, purchaseState.introEligible],
  );

  // Only surfaced once a confirmation has actually failed — the happy path
  // spends about a second in the queue and needs no explanation.
  const hasUnconfirmedPurchase = useSyncExternalStore(
    subscribePendingVerification,
    () => hasFailedVerification(companyId),
    () => hasFailedVerification(companyId),
  );

  const unconfirmedReason = useSyncExternalStore(
    subscribePendingVerification,
    () => permanentVerificationFailure(companyId),
    () => permanentVerificationFailure(companyId),
  );

  // Mirrors `isCompanyBillingManager` in firestore.rules and the server check
  // in `/api/mobile/billing/apple/*`. Showing Buy to anyone else meant StoreKit
  // charged them and the server then refused the receipt.
  const canManageBilling =
    profile?.isCompanyOwner === true || profile?.role === 'owner' || profile?.role === 'admin';

  const purchase = useCallback(async (planId: PlanId) => {
    await manager.purchase(planId);
  }, []);

  const restore = useCallback(
    (options?: { transfer?: boolean }) => manager.restore(options),
    [],
  );
  const openManage = useCallback(() => manager.openManageSubscriptions(), []);
  const reloadProducts = useCallback(() => manager.loadProducts(), []);
  const resetFlow = useCallback(() => manager.resetFlow(), []);
  const warmPlan = useCallback((planId: PlanId) => manager.warmPlan(planId), []);

  const refresh = useCallback(async () => {
    await manager.reconcile(companyId);
  }, [companyId]);

  return {
    entitlement,
    isPro: entitlement.isActive,
    isLoading,
    offers,
    productsLoading: purchaseState.productsLoading,
    productsError: purchaseState.productsError,
    flow: purchaseState.flow,
    introEligible: purchaseState.introEligible,
    trial,
    canManageBilling,
    hasUnconfirmedPurchase,
    unconfirmedReason,
    purchase,
    restore,
    openManage,
    refresh,
    reloadProducts,
    resetFlow,
    warmPlan,
    storePrepared: purchaseState.storePrepared,
  };
}

