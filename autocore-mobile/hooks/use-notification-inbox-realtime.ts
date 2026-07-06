import { useEffect, useRef } from 'react';

import { isProductionCompanyId } from '@/lib/company-id';
import { subscribeInboxRealtime } from '@/services/notifications/inbox-sync';

/**
 * Keeps the notification inbox in sync via Firestore realtime.
 */
export function useNotificationInboxRealtime(enabled: boolean, companyId: string | null): void {
  const companyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !isProductionCompanyId(companyId)) {
      return;
    }

    companyRef.current = companyId;
    const unsubscribe = subscribeInboxRealtime((error) => {
      if (__DEV__) {
        console.warn('[notifications] realtime inbox error', error);
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [companyId, enabled]);
}
