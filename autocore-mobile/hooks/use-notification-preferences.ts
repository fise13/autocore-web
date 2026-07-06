import { useCallback, useEffect, useMemo, useState } from 'react';

import { useSession } from '@/hooks/use-session';
import { getJson, setJson } from '@/lib/storage/kv';
import {
  saveNotificationPreferences,
  subscribeNotificationPreferences,
} from '@/services/firestore/notification-preferences-repository';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationCategory,
  type NotificationPreferences,
} from '@/types/notifications';

const CACHE_KEY = 'autocore-mobile:notification-preferences:v2';

export function useNotificationPreferences() {
  const { uid } = useSession();
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    () => getJson<NotificationPreferences>(CACHE_KEY) ?? DEFAULT_NOTIFICATION_PREFERENCES,
  );
  const [loaded, setLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setLoaded(false);
      return;
    }

    setError(null);
    const unsubscribe = subscribeNotificationPreferences(
      uid,
      (next) => {
        setPreferences(next);
        setJson(CACHE_KEY, next);
        setLoaded(true);
        setError(null);
      },
      () => {
        setLoaded(true);
        setError('Не удалось загрузить настройки');
      },
    );

    return unsubscribe;
  }, [uid]);

  const applyChange = useCallback(
    async (build: (current: NotificationPreferences) => NotificationPreferences) => {
      if (!uid) return;

      let next = DEFAULT_NOTIFICATION_PREFERENCES;
      setPreferences((current) => {
        next = build(current);
        return next;
      });
      setJson(CACHE_KEY, next);
      setSyncing(true);
      setError(null);

      try {
        await saveNotificationPreferences(uid, next);
      } catch (cause) {
        const message =
          cause instanceof Error && cause.message.trim()
            ? cause.message
            : 'Не удалось сохранить настройки';
        setError(message);
      } finally {
        setSyncing(false);
      }
    },
    [uid],
  );

  const updateChannel = useCallback(
    async (key: keyof NotificationPreferences['channels'], value: boolean) => {
      await applyChange((current) => ({
        ...current,
        channels: { ...current.channels, [key]: value },
      }));
    },
    [applyChange],
  );

  const updateCategory = useCallback(
    async (category: NotificationCategory, value: boolean) => {
      await applyChange((current) => ({
        ...current,
        categories: { ...current.categories, [category]: value },
      }));
    },
    [applyChange],
  );

  const updateQuietHours = useCallback(
    async (patch: Partial<NotificationPreferences['quietHours']>) => {
      await applyChange((current) => ({
        ...current,
        quietHours: { ...current.quietHours, ...patch },
      }));
    },
    [applyChange],
  );

  const updateEmailDigest = useCallback(
    async (value: boolean) => {
      await applyChange((current) => ({
        ...current,
        emailDigestEnabled: value,
      }));
    },
    [applyChange],
  );

  const summary = useMemo(() => {
    const enabledCategories = Object.values(preferences.categories).filter(Boolean).length;
    return {
      pushEnabled: preferences.channels.push,
      inboxEnabled: preferences.channels.inbox,
      emailEnabled: preferences.channels.email,
      enabledCategories,
      quietHoursEnabled: preferences.quietHours.enabled,
    };
  }, [preferences]);

  return {
    preferences,
    loaded,
    syncing,
    error,
    summary,
    updateChannel,
    updateCategory,
    updateQuietHours,
    updateEmailDigest,
    /** @deprecated use updateChannel('push', value) */
    updatePreference: async (key: 'pushEnabled' | 'orderUpdates' | 'scanAlerts', value: boolean) => {
      if (key === 'pushEnabled') await updateChannel('push', value);
      if (key === 'scanAlerts') await updateCategory('scan', value);
      if (key === 'orderUpdates') await updateCategory('work_orders', value);
    },
  };
}
