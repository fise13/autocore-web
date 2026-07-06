import { useEffect, useRef } from 'react';

import { useNotificationPreferences } from '@/hooks/use-notification-preferences';
import { NotificationService } from '@/services/notifications';
import { useNotificationStore } from '@/stores/notification-store';

type NotificationProviderProps = {
  enabled: boolean;
  children?: React.ReactNode;
};

/** Initializes NotificationService lifecycle and syncs preferences. */
export function NotificationProvider({ enabled, children }: NotificationProviderProps) {
  const { preferences, loaded } = useNotificationPreferences();
  const initialized = useNotificationStore((s) => s.initialized);
  const initRef = useRef(false);

  useEffect(() => {
    if (!enabled || !loaded) return;

    if (!initRef.current) {
      initRef.current = true;
      void NotificationService.init({
        enabled: true,
        pushEnabled: preferences.channels.push,
        serverPrefs: preferences,
      });
    }

    return () => {
      if (initRef.current) {
        initRef.current = false;
        NotificationService.teardown();
      }
    };
  }, [enabled, loaded]);

  useEffect(() => {
    if (!loaded || !initRef.current) return;
    NotificationService.updatePreferences(preferences);
  }, [preferences, loaded]);

  useEffect(() => {
    if (!enabled || !initialized) return;
    const interval = setInterval(() => {
      void NotificationService.syncInbox();
    }, 60_000);
    return () => clearInterval(interval);
  }, [enabled, initialized]);

  return children ?? null;
}
