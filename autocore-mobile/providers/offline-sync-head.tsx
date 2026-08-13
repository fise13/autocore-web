import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

import { drainMutationOutboxNow } from '@/lib/offline/drain-mutation-outbox';
import { getMutationOutboxSnapshot, subscribeMutationOutbox } from '@/lib/offline/mutation-outbox';
import { syncBackgroundTaskRegistration } from '@/lib/offline/background-sync-task';

const NETWORK_DEBOUNCE_MS = 600;

export function OfflineSyncHead() {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let disposed = false;

    const run = () => {
      if (disposed) return;
      if (getMutationOutboxSnapshot().pendingCount === 0) {
        void syncBackgroundTaskRegistration();
        return;
      }
      void drainMutationOutboxNow().finally(() => {
        void syncBackgroundTaskRegistration();
      });
    };

    run();

    const unsubscribeOutbox = subscribeMutationOutbox(run);
    const unsubscribeNetwork = NetInfo.addEventListener((network) => {
      if (!network.isConnected) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        run();
      }, NETWORK_DEBOUNCE_MS);
    });
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') {
        void syncBackgroundTaskRegistration();
      }
      if (next === 'active' || next === 'background' || next === 'inactive') run();
    });

    return () => {
      disposed = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      unsubscribeOutbox();
      unsubscribeNetwork();
      appState.remove();
    };
  }, []);

  return null;
}
