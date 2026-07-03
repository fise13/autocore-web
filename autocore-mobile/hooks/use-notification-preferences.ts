import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'autocore-mobile:notification-preferences';

type NotificationPreferences = {
  pushEnabled: boolean;
  orderUpdates: boolean;
  scanAlerts: boolean;
};

const DEFAULTS: NotificationPreferences = {
  pushEnabled: true,
  orderUpdates: true,
  scanAlerts: true,
};

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
        setPreferences({ ...DEFAULTS, ...parsed });
      })
      .finally(() => setLoaded(true));
  }, []);

  const updatePreference = useCallback(
    async <K extends keyof NotificationPreferences>(key: K, value: NotificationPreferences[K]) => {
      setPreferences((current) => {
        const next = { ...current, [key]: value };
        void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  return { preferences, loaded, updatePreference };
}
