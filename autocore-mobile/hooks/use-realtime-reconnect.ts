import { useCallback, useRef } from 'react';

import { reconnectRealtimeSubscriptions } from '@/lib/realtime/subscription-registry';
import { NotificationService } from '@/services/notifications';

/** Force Firestore listeners to reconnect and deliver a fresh snapshot. */
export function useRealtimeReconnect() {
  const hadDisconnected = useRef(false);

  return useCallback((queryKeys?: readonly (readonly unknown[])[]) => {
    try {
      reconnectRealtimeSubscriptions(queryKeys);
      if (hadDisconnected.current) {
        NotificationService.notifySync({ type: 'synced' });
        hadDisconnected.current = false;
      }
    } catch {
      hadDisconnected.current = true;
      NotificationService.notifySync({
        type: 'failed',
        retry: () => reconnectRealtimeSubscriptions(queryKeys),
      });
    }
  }, []);
}
