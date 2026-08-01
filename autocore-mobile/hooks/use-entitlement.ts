import { useCallback, useSyncExternalStore } from 'react';

import {
  acquireEntitlement,
  getEntitlementSnapshot,
  subscribeEntitlementRegistry,
} from '@/lib/subscriptions/entitlement-registry';
import type { Entitlement } from '@/lib/subscriptions/types';
import { useSession } from '@/hooks/use-session';

export type UseEntitlementResult = {
  entitlement: Entitlement;
  isLoading: boolean;
  error: string | null;
  /** Convenience: any paid tier. */
  isPro: boolean;
};

/**
 * Subscribe to the company's entitlement.
 *
 * Self-attaching and ref-counted, so it works anywhere in the tree — including
 * `AuthGate`, which renders before `SubscriptionProvider` mounts.
 */
export function useEntitlementFor(companyId: string | null | undefined): UseEntitlementResult {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!companyId) return () => undefined;
      const release = acquireEntitlement(companyId);
      const unsubscribe = subscribeEntitlementRegistry(onStoreChange);
      return () => {
        release();
        unsubscribe();
      };
    },
    [companyId],
  );

  const getSnapshot = useCallback(() => getEntitlementSnapshot(companyId), [companyId]);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    entitlement: snapshot.entitlement,
    isLoading: snapshot.isLoading,
    error: snapshot.error,
    isPro: snapshot.entitlement.isActive,
  };
}

/** Entitlement for the session's active company. */
export function useEntitlement(): UseEntitlementResult {
  const { companyId } = useSession();
  return useEntitlementFor(companyId);
}
