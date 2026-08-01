import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useSession } from '@/hooks/use-session';
import * as manager from '@/lib/subscriptions/subscription-manager';

/** Periodic reconcile floor — foreground events do the real work. */
const RECONCILE_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * SubscriptionProvider — a head component, not a context wrapper.
 *
 * State is published through the entitlement registry and read with
 * `useSyncExternalStore`, matching `SessionRealtimeHead` and
 * `NotificationProvider`. Rendering nothing means a plan change re-renders only
 * the components that actually subscribe, not the whole app.
 *
 * Its job is the imperative side: bind the manager to the active company, drain
 * the StoreKit queue, and reconcile on foreground.
 */
export function SubscriptionProvider() {
  const { companyId } = useSession();
  const lastReconcileRef = useRef(0);

  useEffect(() => {
    manager.attach(companyId);
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;

    const reconcileIfStale = () => {
      const now = Date.now();
      if (now - lastReconcileRef.current < 60_000) return;
      lastReconcileRef.current = now;
      void manager.reconcile(companyId);
    };

    reconcileIfStale();

    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') reconcileIfStale();
    });

    const timer = setInterval(reconcileIfStale, RECONCILE_INTERVAL_MS);

    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, [companyId]);

  return null;
}
