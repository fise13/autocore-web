import { useCallback, useMemo, useSyncExternalStore } from 'react';

import { useEntitlement } from '@/hooks/use-entitlement';
import { useSession } from '@/hooks/use-session';
import { purchasablePlans, type PlanDescriptor } from '@/lib/subscriptions/catalog';
import {
  getPurchaseStoreSnapshot,
  subscribePurchaseStore,
} from '@/lib/subscriptions/purchase-store';
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
  /** Only the workspace owner may buy. */
  canManageBilling: boolean;
  purchase: (planId: PlanId) => Promise<void>;
  restore: () => Promise<RestoreOutcome>;
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

  const canManageBilling = Boolean(profile?.isCompanyOwner);

  const purchase = useCallback(async (planId: PlanId) => {
    await manager.purchase(planId);
  }, []);

  const restore = useCallback(() => manager.restore(), []);
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

