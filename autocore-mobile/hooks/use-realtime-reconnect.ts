import { useCallback } from 'react';

import { reconnectRealtimeSubscriptions } from '@/lib/realtime/subscription-registry';

/** Force Firestore listeners to reconnect and deliver a fresh snapshot. */
export function useRealtimeReconnect() {
  return useCallback((queryKeys?: readonly (readonly unknown[])[]) => {
    reconnectRealtimeSubscriptions(queryKeys);
  }, []);
}
