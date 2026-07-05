import { useCallback, useSyncExternalStore } from 'react';

import {
  acquireCompanySubscription,
  getSubscriptionSnapshot,
  subscribeSubscriptionRegistry,
} from '@/lib/billing/subscription-registry';
import { isProSubscription } from '@/types/billing';

const noop = () => undefined;

export function useCompanySubscription(companyId: string | null | undefined) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!companyId) return () => undefined;

      // Listener lifecycle only — updates flow through subscribeSubscriptionRegistry + getSnapshot.
      const release = acquireCompanySubscription(companyId, {
        onData: noop,
        onError: noop,
      });
      const unsubscribeRegistry = subscribeSubscriptionRegistry(onStoreChange);
      return () => {
        release();
        unsubscribeRegistry();
      };
    },
    [companyId],
  );

  const getSnapshot = useCallback(
    () => getSubscriptionSnapshot(companyId),
    [companyId],
  );

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    subscription: snapshot.subscription,
    isLoading: snapshot.isLoading,
    error: snapshot.error,
    isPro: isProSubscription(snapshot.subscription),
  };
}
