import { useMemo } from 'react';

import { useEntitlementFor } from '@/hooks/use-entitlement';
import { planById } from '@/lib/subscriptions/catalog';
import type { CompanySubscription } from '@/types/billing';

/**
 * Compatibility adapter over `useEntitlement`.
 *
 * The subscription system moved to `lib/subscriptions`, but a dozen call sites
 * still speak in `CompanySubscription`. This projects the resolved entitlement
 * back into that shape so they keep working unchanged — one source of truth,
 * two vocabularies, no duplicated state. New code should use `useEntitlement`.
 */
export function useCompanySubscription(companyId: string | null | undefined) {
  const { entitlement, isLoading, error, isPro } = useEntitlementFor(companyId);

  const subscription = useMemo<CompanySubscription | null>(() => {
    if (!entitlement.companyId) return null;

    return {
      plan: entitlement.tier,
      status: entitlement.status,
      proActive: entitlement.isActive,
      provider: entitlement.provider,
      billingInterval: planById(entitlement.planId).interval,
      currentPeriodEnd: entitlement.renewsAt,
      willAutoRenew: entitlement.willAutoRenew,
      trialUsed: entitlement.trialUsed,
      gracePeriodEnd: null,
      updatedAt: null,
    };
  }, [entitlement]);

  return { subscription, isLoading, error, isPro };
}
