import { useEffect } from 'react';

/**
 * @deprecated Push lifecycle is managed by NotificationProvider.
 * Kept for backward compatibility — no-op side effects.
 */
export function usePushNotifications(_enabled: boolean) {
  useEffect(() => {
    // NotificationProvider handles push setup via NotificationService.init()
  }, []);

  return { pushToken: null, permission: null };
}
