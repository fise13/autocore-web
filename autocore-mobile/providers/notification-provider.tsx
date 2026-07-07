import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useNotificationPreferences } from '@/hooks/use-notification-preferences';
import { useNotificationInboxRealtime } from '@/hooks/use-notification-inbox-realtime';
import { useSession } from '@/hooks/use-session';
import { isProductionCompanyId } from '@/lib/company-id';
import { NotificationService } from '@/services/notifications';
import { useNotificationStore } from '@/stores/notification-store';

type NotificationProviderProps = {
  enabled: boolean;
  children?: React.ReactNode;
};

/** Initializes NotificationService lifecycle and syncs preferences. */
export function NotificationProvider({ enabled, children }: NotificationProviderProps) {
  const { preferences, loaded } = useNotificationPreferences();
  const { uid, companyId } = useSession();
  const initialized = useNotificationStore((s) => s.initialized);
  const initRef = useRef(false);
  const lastCompanyIdRef = useRef<string | null>(null);

  const canRun = enabled && loaded && Boolean(uid) && isProductionCompanyId(companyId);

  useEffect(() => {
    if (!canRun || initRef.current) return;

    initRef.current = true;
    void NotificationService.init({
      enabled: true,
      pushEnabled: preferences.channels.push,
      serverPrefs: preferences,
    });
  }, [canRun, preferences]);

  useEffect(() => {
    if (!uid && initRef.current) {
      initRef.current = false;
      NotificationService.teardown();
    }
  }, [uid]);

  useEffect(() => {
    return () => {
      if (initRef.current) {
        initRef.current = false;
        NotificationService.teardown();
      }
    };
  }, []);

  useEffect(() => {
    if (!loaded || !initRef.current) return;
    NotificationService.updatePreferences(preferences);
  }, [preferences, loaded]);

  useEffect(() => {
    if (!canRun || !initialized) return;

    if (lastCompanyIdRef.current && lastCompanyIdRef.current !== companyId) {
      void NotificationService.syncInbox();
    }
    lastCompanyIdRef.current = companyId;
  }, [canRun, companyId, initialized]);

  useNotificationInboxRealtime(canRun && initialized, companyId);

  useEffect(() => {
    if (!canRun || !initialized) return;
    const interval = setInterval(() => {
      void NotificationService.syncInbox();
    }, 30_000);
    return () => clearInterval(interval);
  }, [canRun, initialized]);

  useEffect(() => {
    if (!canRun || !initialized) return;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void NotificationService.syncInbox();
      }
    });

    return () => subscription.remove();
  }, [canRun, initialized]);

  return children ?? null;
}
